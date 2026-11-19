import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { ProfilerStatsDTO } from "../dtos/ProfilerStats.dto";
import type { TraceSpanDTO } from "../dtos/TraceSpan.dto";

/** Common surface of an active `Profiler` and of the disabled no-op handle. */
export interface ProfilerHandle {
	/** `false` for the disabled no-op handle (nothing configured, or `PROFILER_ENABLED=false`). */
	readonly enabled: boolean;
	/** Whether the capture loop is active. */
	readonly running: boolean;
	/** Starts sampling. Resolves immediately on a disabled handle. */
	start(): Promise<void>;
	/** Final flush, then stop. Safe to call repeatedly. */
	stop(): Promise<void>;
	/** Counters and health. */
	stats(): ProfilerStatsDTO;
	/**
	 * Runs `fn` with `labels` attached to the samples taken meanwhile. Safe with concurrent and
	 * overlapping calls (labels only apply to samples whose time falls inside the call).
	 */
	tag<T>(labels: ProfileLabelsDTO, fn: () => T | Promise<T>): Promise<Awaited<T>>;
	/** Binds the profile samples taken until the returned function is called to `span`. */
	trackSpan(span: TraceSpanDTO): (finalLabels?: ProfileLabelsDTO) => void;
	[Symbol.asyncDispose](): Promise<void>;
}
