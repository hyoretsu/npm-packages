import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { SpanTrackerStatsDTO } from "../dtos/SpanTrackerStats.dto";
import type { TraceSpanDTO } from "../dtos/TraceSpan.dto";
import type { TrackedIntervalDTO } from "../dtos/TrackedInterval.dto";

/** Ends a tracked interval. Idempotent. Optional labels are merged in (for example a late `route`). */
export type EndInterval = (finalLabels?: ProfileLabelsDTO) => void;

/**
 * Tracks wall-clock intervals during which a span (or a label scope) was active, with bounded
 * memory, so converted profile samples can be attributed to them.
 */
export abstract class SpanTracker {
	/** Opens a label-only interval (used by `profiler.tag`). */
	abstract beginLabels(labels: ProfileLabelsDTO): EndInterval;

	/** Opens a span interval. Malformed ids are ignored and a no-op end function is returned. */
	abstract beginSpan(span: TraceSpanDTO): EndInterval;

	/** Drops every closed interval that ended before `beforeMs`. Returns how many were dropped. */
	abstract prune(beforeMs: number): number;

	/** Intervals overlapping `[fromMs, untilMs]`, including still-open ones, oldest first. */
	abstract snapshot(fromMs: number, untilMs: number): TrackedIntervalDTO[];

	abstract stats(): SpanTrackerStatsDTO;
}
