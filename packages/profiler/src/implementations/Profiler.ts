import type { Session } from "node:inspector/promises";
import { attributeSamples } from "../attribution";
import { sampleWallTimesMs } from "../cdp";
import { optionsFromEnv, resolveConfig } from "../config";
import { calculateSampleRate, convertToFolded, convertToFoldedWallTime } from "../converter";
import type { CdpProfileDTO } from "../dtos/CdpProfile.dto";
import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { ProfilerMemoryStatsDTO } from "../dtos/ProfilerMemoryStats.dto";
import type { ProfilerOptionsDTO } from "../dtos/ProfilerOptions.dto";
import type { ProfilerStatsDTO } from "../dtos/ProfilerStats.dto";
import type { ProfileTypeDTO } from "../dtos/ProfileType.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import type { ResolvedProfilerConfigDTO } from "../dtos/ResolvedProfilerConfig.dto";
import type { SampleLabelAssignmentDTO } from "../dtos/SampleLabelAssignment.dto";
import type { TraceSpanDTO } from "../dtos/TraceSpan.dto";
import type { TrackedIntervalDTO } from "../dtos/TrackedInterval.dto";
import type { WallClockAnchorDTO } from "../dtos/WallClockAnchor.dto";
import type { WallClockCalibrationDTO } from "../dtos/WallClockCalibration.dto";
import { ProfilerConcurrencyError } from "../errors/ProfilerConcurrencyError";
import { ProfilerConfigError } from "../errors/ProfilerConfigError";
import { RESERVED_LABELS, validateLabels } from "../labels";
import { createLog, type Log } from "../logger";
import type { ProfileExporter } from "../models/ProfileExporter";
import type { ProfilerHandle } from "../models/ProfilerHandle";
import type { EndInterval } from "../models/SpanTracker";
import { samplerRegistry } from "../registry";
import { createCalibration, readClocks, resolveAnchor } from "../wall-clock";
import { ExporterRunner } from "./ExporterRunner";
import { IntervalSpanTracker } from "./IntervalSpanTracker";
import { PyroscopeExporter } from "./PyroscopeExporter";
import { SourceMapResolver } from "./SourceMapResolver";

const NOOP_END: EndInterval = () => undefined;

interface CapturedWindow {
	calibration: WallClockCalibrationDTO;
	from: number;
	labels: Readonly<ProfileLabelsDTO>;
	profile: CdpProfileDTO;
	sampleIntervalUs: number;
	until: number;
}

/**
 * Continuous CPU profiler on top of the Chrome DevTools Protocol (`node:inspector`), working on
 * Node >= 18 and Bun. Windows of `pushIntervalMs` are captured, converted and handed to every
 * exporter; `trackSpan`/`tag` bind the samples to traces and labels.
 *
 * Use `createProfiler()` / `startProfiling()` for environment-driven, never-throwing setup; this
 * class is the strict form (it throws `ProfilerConfigError` without a destination).
 */
export class Profiler implements ProfilerHandle {
	readonly enabled = true;
	declare readonly [Symbol.asyncDispose]: () => Promise<void>;

	private readonly config: ResolvedProfilerConfigDTO;
	private readonly log: Log;
	private readonly runners: ExporterRunner[];
	private readonly sourceMapResolver: SourceMapResolver | null;
	private readonly tracker: IntervalSpanTracker;
	private activeCycle: Promise<void> | null = null;
	private ambiguousSamples = 0;
	private attributedSamples = 0;
	private captureFailures = 0;
	private capturedSamples = 0;
	private capturedWindows = 0;
	private cardinalityLimitedSamples = 0;
	private currentSampleIntervalUs: number;
	private emptyWindows = 0;
	private jscHeapStats: (() => Record<string, number>) | null = null;
	private lastAnchor: WallClockAnchorDTO | null = null;
	private lastCaptureGapMs: number | null = null;
	private lastConversionDurationMs: number | null = null;
	private maxCaptureGapMs = 0;
	private profileActive = false;
	private pushTimer: ReturnType<typeof setTimeout> | null = null;
	private samplingIntervalChanges = 0;
	private session: Session | null = null;
	private signalHandlers: { sigint: () => void; sigterm: () => void } | null = null;
	private stopPromise: Promise<void> | null = null;
	private unattributedSamples = 0;
	private windowCalibration: WallClockCalibrationDTO = { afterWallMs: 0, beforeWallMs: 0 };
	private windowStartedAtMs = 0;
	private windowLabels: Readonly<ProfileLabelsDTO> = Object.freeze({});
	private windowStart = 0;
	private isRunning = false;

	constructor(options: ProfilerOptionsDTO) {
		this.config = resolveConfig(options);
		this.log = createLog(this.config.debug, this.config.logger);
		this.currentSampleIntervalUs = this.config.sampleIntervalUs;
		this.sourceMapResolver = this.config.sourceMaps.enabled
			? new SourceMapResolver(this.config.sourceMaps.cacheSize)
			: null;
		this.tracker = new IntervalSpanTracker({
			maxIntervals: this.config.tracing.maxTrackedSpans,
			maxSpanAgeMs: this.config.tracing.maxSpanAgeMs,
		});
		const exporters: ProfileExporter[] = [...this.config.exporters];
		if (this.config.pyroscopeUrl) {
			exporters.unshift(
				new PyroscopeExporter({
					authToken: this.config.authToken,
					basicAuth: this.config.basicAuth,
					compress: this.config.compress,
					format: this.config.pyroscopeFormat,
					headers: this.config.headers,
					tenantId: this.config.tenantId,
					timeoutMs: this.config.exportTimeoutMs,
					url: this.config.pyroscopeUrl,
				}),
			);
		}
		const names = new Set<string>();
		for (const exporter of exporters) {
			if (!exporter.name?.trim()) throw new ProfilerConfigError("exporter name must not be empty");
			if (names.has(exporter.name))
				throw new ProfilerConfigError(`duplicate exporter name ${JSON.stringify(exporter.name)}`);
			names.add(exporter.name);
		}
		this.runners = exporters.map(
			exporter =>
				new ExporterRunner(exporter, {
					debug: message => this.log("debug", message),
					maxPending: this.config.maxPendingWindows,
					maxRetries: this.config.maxRetries,
				}),
		);
	}

	/** Builds a profiler from the environment (see `optionsFromEnv`); explicit `overrides` win. */
	static fromEnv(overrides: Partial<ProfilerOptionsDTO> = {}): Profiler {
		return new Profiler(optionsFromEnv(overrides));
	}

	get running(): boolean {
		return this.isRunning;
	}

	async start(): Promise<void> {
		await this.stopPromise;
		if (this.isRunning) {
			this.log("warn", "start() called but the profiler is already running");
			return;
		}
		if (!samplerRegistry.acquire(this)) {
			throw new ProfilerConcurrencyError(
				"another profiler is already active in this process; Bun supports only one inspector CPU sampler per process",
			);
		}
		try {
			const mod = await import("node:inspector/promises");
			if (!mod.Session) throw new Error("Session export missing");
			this.session = new mod.Session();
			this.session.connect();
			await this.session.post("Profiler.enable");
			await this.session.post("Profiler.setSamplingInterval", {
				interval: this.currentSampleIntervalUs,
			});
		} catch (error) {
			this.cleanupFailedStart();
			throw new Error(
				`[@hyoretsu/profiler] Failed to initialize the inspector profiler (needs Node.js >= 18 or Bun with node:inspector support): ${error}`,
			);
		}
		await this.detectJscHeapStats();
		this.isRunning = true;
		if (this.config.signalHandlers) this.installSignalHandlers();
		try {
			await this.beginWindow();
			this.scheduleNextWindow();
		} catch (error) {
			this.isRunning = false;
			this.removeSignalHandlers();
			this.cleanupFailedStart();
			throw error;
		}
	}

	stop(): Promise<void> {
		if (this.stopPromise) return this.stopPromise;
		this.stopPromise = this.stopInternal().finally(() => {
			this.stopPromise = null;
		});
		return this.stopPromise;
	}

	private async stopInternal(): Promise<void> {
		if (!this.isRunning && !this.profileActive) return;
		this.isRunning = false;
		this.clearTimer();
		await this.activeCycle?.catch(() => undefined);
		if (this.profileActive) {
			await this.captureWindow(false).catch(error =>
				this.log("warn", `Final capture failed: ${error}`),
			);
		}
		await this.drainExporters();
		this.removeSignalHandlers();
		try {
			this.session?.disconnect();
		} catch {
			// Already disconnected.
		}
		this.session = null;
		this.tracker.prune(Number.POSITIVE_INFINITY);
		samplerRegistry.release(this);
	}

	private cleanupFailedStart(): void {
		try {
			this.session?.disconnect();
		} catch {
			// Ignore cleanup failures.
		}
		this.session = null;
		this.profileActive = false;
		samplerRegistry.release(this);
	}

	/** Starts a sampling window and anchors the engine clock to wall-clock time. */
	private async beginWindow(): Promise<void> {
		if (!this.session || !this.isRunning) return;
		this.windowStart = Math.floor(Date.now() / 1_000);
		this.windowLabels = Object.freeze({ ...this.config.labels });
		const before = readClocks();
		await this.session.post("Profiler.start");
		this.windowCalibration = createCalibration(before, readClocks());
		this.windowStartedAtMs = this.windowCalibration.beforeWallMs;
		this.profileActive = true;
	}

	private scheduleNextWindow(): void {
		if (!this.isRunning || this.pushTimer) return;
		this.pushTimer = setTimeout(() => {
			this.pushTimer = null;
			const cycle = this.captureWindow(true).catch(error => {
				this.log("error", `Capture cycle failed: ${error}`);
				if (this.isRunning && !this.profileActive) {
					void this.beginWindow()
						.then(() => this.scheduleNextWindow())
						.catch(startError => this.log("error", `Failed to recover profiler: ${startError}`));
				}
			});
			this.activeCycle = cycle;
			void cycle.finally(() => {
				if (this.activeCycle === cycle) this.activeCycle = null;
				// A conversion failure must not silently kill future rotations while sampling continues.
				if (this.isRunning && this.profileActive) this.scheduleNextWindow();
			});
		}, this.config.pushIntervalMs);
		// Profiling must not keep a short-lived script alive; the preload flushes on beforeExit.
		this.pushTimer.unref?.();
	}

	private clearTimer(): void {
		if (this.pushTimer) clearTimeout(this.pushTimer);
		this.pushTimer = null;
	}

	/** Stop, immediately restart, and only then convert/export the completed profile. */
	private async captureWindow(restart: boolean): Promise<void> {
		if (!this.session || !this.profileActive) return;
		const session = this.session;
		const captured: Omit<CapturedWindow, "profile" | "until"> = {
			calibration: this.windowCalibration,
			from: this.windowStart,
			labels: this.windowLabels,
			sampleIntervalUs: this.currentSampleIntervalUs,
		};
		const gapStarted = performance.now();
		let profile: CdpProfileDTO;
		try {
			profile = ((await session.post("Profiler.stop")) as { profile: CdpProfileDTO }).profile;
			this.profileActive = false;
		} catch (error) {
			this.captureFailures++;
			throw error;
		}
		const until = Math.max(Math.floor(Date.now() / 1_000), captured.from + 1);

		// Core blind-spot fix: no conversion or network work happens until sampling is active again.
		if (restart && this.isRunning) {
			await this.adjustSamplingInterval(profile, session);
			await this.beginWindow();
			const gapMs = performance.now() - gapStarted;
			this.lastCaptureGapMs = gapMs;
			this.maxCaptureGapMs = Math.max(this.maxCaptureGapMs, gapMs);
		}
		await this.processCaptured({ ...captured, profile, until });
		if (restart && this.isRunning) this.scheduleNextWindow();
	}

	private async processCaptured(captured: CapturedWindow): Promise<void> {
		const started = performance.now();
		const profile = this.sourceMapResolver
			? await this.sourceMapResolver.resolveProfile(captured.profile)
			: captured.profile;
		this.capturedWindows++;
		this.capturedSamples += profile.samples?.length ?? 0;
		const sampleLabels = this.attribute(profile, captured.calibration);

		const folded = convertToFolded(profile);
		if (folded) {
			this.enqueue(
				this.makeWindow("cpu", folded, calculateSampleRate(profile), profile, captured, sampleLabels),
			);
		} else {
			this.emptyWindows++;
		}
		if (this.config.wallTime.enabled) {
			const wall = convertToFoldedWallTime(profile, captured.sampleIntervalUs);
			if (wall) this.enqueue(this.makeWindow("wall", wall, 1_000_000, profile, captured, undefined));
		}
		// Intervals that ended before the live window started can no longer overlap any sample.
		this.tracker.prune(this.isRunning ? this.windowStartedAtMs : Number.POSITIVE_INFINITY);
		this.lastConversionDurationMs = performance.now() - started;
	}

	/** Binds samples to the tracked spans/tags active at their wall-clock time. */
	private attribute(
		profile: CdpProfileDTO,
		calibration: WallClockCalibrationDTO,
	): SampleLabelAssignmentDTO | undefined {
		const anchor = resolveAnchor(calibration, profile);
		this.lastAnchor = anchor;
		const samples = profile.samples?.length ?? 0;
		if (!this.config.tracing.enabled || samples === 0) return undefined;
		const times = sampleWallTimesMs(profile, anchor);
		const endMs = times[times.length - 1] ?? anchor.startMs;
		const intervals: TrackedIntervalDTO[] = this.tracker.snapshot(anchor.startMs, endMs);
		const { assignment, stats } = attributeSamples(
			times,
			intervals,
			this.config.tracing.maxSampleLabelSets,
		);
		this.attributedSamples += stats.attributed;
		this.unattributedSamples += stats.unattributed;
		this.ambiguousSamples += stats.ambiguous;
		this.cardinalityLimitedSamples += stats.cardinalityLimited;
		return assignment;
	}

	private makeWindow(
		type: ProfileTypeDTO,
		folded: string,
		sampleRate: number,
		profile: CdpProfileDTO,
		captured: CapturedWindow,
		sampleLabels: SampleLabelAssignmentDTO | undefined,
	): ProfileWindowDTO {
		return Object.freeze({
			appName: this.config.appName,
			folded,
			from: captured.from,
			labels: captured.labels,
			profile,
			sampleIntervalUs: captured.sampleIntervalUs,
			sampleLabels,
			sampleRate,
			type,
			until: captured.until,
		});
	}

	private enqueue(window: ProfileWindowDTO): void {
		for (const runner of this.runners) runner.enqueue(window);
	}

	private async drainExporters(): Promise<void> {
		const draining = (async () => {
			await Promise.all(this.runners.map(runner => runner.waitForIdle()));
			await Promise.allSettled(this.runners.map(runner => runner.shutdown()));
		})();
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const completed = await Promise.race([
			draining.then(() => true),
			new Promise<false>(resolve => {
				timeout = setTimeout(() => resolve(false), this.config.shutdownTimeoutMs);
			}),
		]);
		if (timeout) clearTimeout(timeout);
		if (!completed) {
			for (const runner of this.runners) runner.abortAndDrop();
			// An exporter may ignore AbortSignal; never await it past the deadline.
			void draining.catch(() => undefined);
		}
	}

	stats(): ProfilerStatsDTO {
		const exporters = Object.fromEntries(
			this.runners.map(runner => [runner.exporter.name, runner.stats()]),
		);
		const all = Object.values(exporters);
		const streams = ["cpu"];
		if (this.config.wallTime.enabled) streams.push("wall");
		return {
			capturedSamples: this.capturedSamples,
			capturedWindows: this.capturedWindows,
			captureFailures: this.captureFailures,
			currentSampleIntervalUs: this.currentSampleIntervalUs,
			emptyWindows: this.emptyWindows,
			exporters,
			failedWindows: all.reduce((sum, item) => sum + item.failedProfiles, 0),
			lastCaptureGapMs: this.lastCaptureGapMs,
			lastConversionDurationMs: this.lastConversionDurationMs,
			lastError: [...all].reverse().find(item => item.lastError !== null)?.lastError ?? null,
			lastPushAt: all.reduce<number | null>(
				(latest, item) =>
					item.lastSuccessAt !== null && (latest === null || item.lastSuccessAt > latest)
						? item.lastSuccessAt
						: latest,
				null,
			),
			maxCaptureGapMs: this.maxCaptureGapMs,
			memory: this.memoryStats(),
			pushedWindows: all.reduce((sum, item) => sum + item.exportedProfiles, 0),
			running: this.isRunning,
			samplingIntervalChanges: this.samplingIntervalChanges,
			streams,
			tracing: {
				...this.tracker.stats(),
				ambiguousSamples: this.ambiguousSamples,
				attributedSamples: this.attributedSamples,
				cardinalityLimitedSamples: this.cardinalityLimitedSamples,
				lastAnchorMethod: this.lastAnchor?.method ?? null,
				lastAnchorUncertaintyMs: this.lastAnchor?.uncertaintyMs ?? null,
				unattributedSamples: this.unattributedSamples,
			},
		};
	}

	private async adjustSamplingInterval(profile: CdpProfileDTO, session: Session): Promise<void> {
		if (!this.config.adaptiveSampling.enabled) return;
		const durationUs = Math.max(1, profile.endTime - profile.startTime);
		const utilization =
			(profile.samples?.length ?? 0) / Math.max(1, durationUs / this.currentSampleIntervalUs);
		const next =
			utilization >= this.config.adaptiveSampling.busyThreshold
				? this.config.adaptiveSampling.busyIntervalUs
				: this.config.adaptiveSampling.idleIntervalUs;
		if (next === this.currentSampleIntervalUs) return;
		await session.post("Profiler.setSamplingInterval", { interval: next });
		this.currentSampleIntervalUs = next;
		this.samplingIntervalChanges++;
	}

	/**
	 * Binds the profile samples taken until the returned function is called to `span`. Samples are
	 * attributed at conversion time by wall-clock overlap, so this is cheap (two clock reads) and
	 * never touches the sampler. A no-op when the profiler is not running or tracing is disabled.
	 *
	 * @returns an idempotent end function; it optionally takes late labels (for example `route`).
	 */
	trackSpan(span: TraceSpanDTO): EndInterval {
		if (!this.isRunning || !this.config.tracing.enabled) return NOOP_END;
		return this.tracker.beginSpan(span);
	}

	/**
	 * Runs `fn` with `labels` attached to the samples taken while it runs. Implemented as a label
	 * range on the tracker, not as a sampler stop/restart, so concurrent and overlapping calls are
	 * safe; where calls overlap only labels with identical values are attached.
	 *
	 * @throws ProfilerConfigError for invalid label keys/values (a programming error).
	 */
	async tag<T>(labels: ProfileLabelsDTO, fn: () => T | Promise<T>): Promise<Awaited<T>> {
		const clean = validateLabels(labels, true, RESERVED_LABELS);
		if (!this.isRunning || !this.config.tracing.enabled) return (await fn()) as Awaited<T>;
		const end = this.tracker.beginLabels(clean);
		try {
			return (await fn()) as Awaited<T>;
		} finally {
			end();
		}
	}

	private memoryStats(): ProfilerMemoryStatsDTO {
		const memory = process.memoryUsage();
		const result: ProfilerMemoryStatsDTO = {
			externalBytes: memory.external,
			heapTotalBytes: memory.heapTotal,
			heapUsedBytes: memory.heapUsed,
			rssBytes: memory.rss,
		};
		try {
			const jsc = this.jscHeapStats?.();
			if (jsc) {
				if (typeof jsc.heapSize === "number") result.jscHeapSizeBytes = jsc.heapSize;
				if (typeof jsc.heapCapacity === "number") result.jscHeapCapacityBytes = jsc.heapCapacity;
				if (typeof jsc.extraMemorySize === "number")
					result.jscExtraMemorySizeBytes = jsc.extraMemorySize;
			}
		} catch {
			// Memory metrics must never affect profiling.
		}
		return result;
	}

	/** Guarded `bun:jsc.heapStats` lookup: metrics only, never snapshots. */
	private async detectJscHeapStats(): Promise<void> {
		if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") return;
		try {
			const specifier = "bun:jsc";
			const mod = (await import(/* @vite-ignore */ specifier)) as {
				heapStats?: () => Record<string, number>;
			};
			if (mod.heapStats) this.jscHeapStats = mod.heapStats;
		} catch {
			// Node and older Bun versions do not provide this module.
		}
	}

	private installSignalHandlers(): void {
		if (this.signalHandlers) return;
		const shutdown = async (signal: NodeJS.Signals) => {
			this.log("debug", `Received ${signal}, flushing final profile...`);
			await this.stop().catch(error => this.log("error", `Error during shutdown: ${error}`));
			process.kill(process.pid, signal);
		};
		const sigterm = () => void shutdown("SIGTERM");
		const sigint = () => void shutdown("SIGINT");
		this.signalHandlers = { sigint, sigterm };
		process.on("SIGTERM", sigterm);
		process.on("SIGINT", sigint);
	}

	private removeSignalHandlers(): void {
		if (!this.signalHandlers) return;
		process.removeListener("SIGTERM", this.signalHandlers.sigterm);
		process.removeListener("SIGINT", this.signalHandlers.sigint);
		this.signalHandlers = null;
	}
}

if (typeof Symbol.asyncDispose === "symbol") {
	Object.defineProperty(Profiler.prototype, Symbol.asyncDispose, {
		configurable: true,
		value(this: Profiler) {
			return this.stop();
		},
		writable: true,
	});
}
