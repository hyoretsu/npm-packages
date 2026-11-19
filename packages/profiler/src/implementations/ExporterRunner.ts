import type { ExporterStatsDTO } from "../dtos/ExporterStats.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import { ExporterError } from "../errors/ExporterError";
import type { ProfileExporter } from "../models/ProfileExporter";
import { retryDelayMs } from "../retry";

export interface ExporterRunnerOptions {
	debug: (message: string) => void;
	maxPending: number;
	maxRetries: number;
	random?: () => number;
	wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

/**
 * Serial, bounded queue in front of one exporter: retries with jittered backoff (4xx are not
 * retried), drops the oldest window when full, and can abort in-flight work on shutdown timeout.
 */
export class ExporterRunner {
	readonly exporter: ProfileExporter;
	private active: Promise<void> | null = null;
	private activeController: AbortController | null = null;
	private readonly debug: (message: string) => void;
	private droppedProfiles = 0;
	private exportedBytes = 0;
	private exportedProfiles = 0;
	private failedProfiles = 0;
	private idleWaiters: Array<() => void> = [];
	private lastError: string | null = null;
	private lastExportDurationMs: number | null = null;
	private lastSuccessAt: number | null = null;
	private readonly maxPending: number;
	private readonly maxRetries: number;
	private readonly queue: ProfileWindowDTO[] = [];
	private readonly random: () => number;
	private retries = 0;
	private stopping = false;
	private readonly wait: (ms: number, signal: AbortSignal) => Promise<void>;

	constructor(exporter: ProfileExporter, options: ExporterRunnerOptions) {
		this.exporter = exporter;
		this.maxPending = options.maxPending;
		this.maxRetries = options.maxRetries;
		this.debug = options.debug;
		this.random = options.random ?? Math.random;
		this.wait = options.wait ?? sleep;
	}

	enqueue(window: ProfileWindowDTO): void {
		if (this.stopping) {
			this.droppedProfiles++;
			this.lastError = "exporter is shutting down; profile dropped";
			return;
		}
		if (this.queue.length >= this.maxPending) {
			this.queue.shift();
			this.droppedProfiles++;
			this.lastError = "export queue full; dropped oldest profile";
		}
		this.queue.push(window);
		this.startDrain();
	}

	private startDrain(): void {
		if (this.active) return;
		this.active = this.drain().finally(() => {
			this.active = null;
			if (this.queue.length > 0) this.startDrain();
			else this.resolveIdle();
		});
	}

	private async drain(): Promise<void> {
		while (!this.stopping && this.queue.length > 0) {
			const window = this.queue.shift();
			if (!window) continue;
			let finalError: Error | null = null;
			const started = performance.now();
			const controller = new AbortController();
			this.activeController = controller;
			for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
				if (attempt > 0) {
					this.retries++;
					const retryAfterMs =
						finalError instanceof ExporterError ? finalError.retryAfterMs : undefined;
					const delayMs = retryDelayMs(attempt, retryAfterMs, this.random);
					this.debug(`${this.exporter.name}: retry ${attempt}/${this.maxRetries} in ${delayMs}ms`);
					try {
						await this.wait(delayMs, controller.signal);
					} catch (error) {
						finalError = error instanceof Error ? error : new Error(String(error));
						break;
					}
				}
				try {
					const result = await this.exporter.export(window, controller.signal);
					this.exportedProfiles++;
					this.lastSuccessAt = Date.now();
					this.lastError = null;
					this.lastExportDurationMs = performance.now() - started;
					this.exportedBytes += result?.bytes ?? 0;
					finalError = null;
					break;
				} catch (error) {
					finalError = error instanceof Error ? error : new Error(String(error));
					if (error instanceof ExporterError && !error.retryable) break;
				}
			}
			this.activeController = null;
			if (finalError && !this.stopping) {
				this.failedProfiles++;
				this.lastError = finalError.message;
				this.lastExportDurationMs = performance.now() - started;
			}
		}
	}

	stats(): ExporterStatsDTO {
		return {
			droppedProfiles: this.droppedProfiles,
			exportedBytes: this.exportedBytes,
			exportedProfiles: this.exportedProfiles,
			failedProfiles: this.failedProfiles,
			inFlight: this.active !== null,
			lastError: this.lastError,
			lastExportDurationMs: this.lastExportDurationMs,
			lastSuccessAt: this.lastSuccessAt,
			queueDepth: this.queue.length,
			retries: this.retries,
		};
	}

	async waitForIdle(): Promise<void> {
		if (!this.active && this.queue.length === 0) return;
		await new Promise<void>(resolve => this.idleWaiters.push(resolve));
	}

	/** Abort the in-flight attempt and drop everything queued (shutdown timeout). */
	abortAndDrop(): void {
		if (this.stopping) return;
		this.stopping = true;
		this.activeController?.abort();
		this.droppedProfiles += this.queue.length + (this.active ? 1 : 0);
		this.queue.length = 0;
		this.lastError = "shutdown timeout; pending profiles dropped";
		this.resolveIdle();
	}

	async shutdown(): Promise<void> {
		await this.exporter.shutdown?.();
	}

	private resolveIdle(): void {
		for (const resolve of this.idleWaiters.splice(0)) resolve();
	}
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) return reject(new ExporterError("export aborted", { retryable: false }));
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(new ExporterError("export aborted", { retryable: false }));
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
