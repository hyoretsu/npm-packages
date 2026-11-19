import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { ProfilerStatsDTO } from "../dtos/ProfilerStats.dto";
import type { ProfilerHandle } from "../models/ProfilerHandle";

/** Disabled handle returned when nothing is configured: every method is a cheap no-op. */
export class NoopProfiler implements ProfilerHandle {
	declare readonly [Symbol.asyncDispose]: () => Promise<void>;
	readonly enabled = false;
	readonly running = false;

	/** Why the handle is disabled (not configured, `PROFILER_ENABLED=false`, or a startup failure). */
	readonly reason: string;

	constructor(reason = "profiling is not configured") {
		this.reason = reason;
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	stats(): ProfilerStatsDTO {
		return {
			capturedSamples: 0,
			capturedWindows: 0,
			captureFailures: 0,
			currentSampleIntervalUs: 0,
			emptyWindows: 0,
			exporters: {},
			failedWindows: 0,
			lastCaptureGapMs: null,
			lastConversionDurationMs: null,
			lastError: this.reason,
			lastPushAt: null,
			maxCaptureGapMs: 0,
			memory: { externalBytes: 0, heapTotalBytes: 0, heapUsedBytes: 0, rssBytes: 0 },
			pushedWindows: 0,
			running: false,
			samplingIntervalChanges: 0,
			streams: [],
			tracing: {
				activeIntervals: 0,
				ambiguousSamples: 0,
				attributedSamples: 0,
				cardinalityLimitedSamples: 0,
				evictedIntervals: 0,
				invalidSpans: 0,
				lastAnchorMethod: null,
				lastAnchorUncertaintyMs: null,
				orphanedIntervals: 0,
				retainedIntervals: 0,
				unattributedSamples: 0,
			},
		};
	}

	async tag<T>(_labels: ProfileLabelsDTO, fn: () => T | Promise<T>): Promise<Awaited<T>> {
		return (await fn()) as Awaited<T>;
	}

	trackSpan(): () => void {
		return () => undefined;
	}
}

if (typeof Symbol.asyncDispose === "symbol") {
	Object.defineProperty(NoopProfiler.prototype, Symbol.asyncDispose, {
		configurable: true,
		value: async () => undefined,
		writable: true,
	});
}
