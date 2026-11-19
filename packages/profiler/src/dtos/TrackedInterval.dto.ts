import type { ProfileLabelsDTO } from "./ProfileLabels.dto";

/** A tracked wall-clock interval. `kind: "tag"` intervals carry labels only (no ids). */
export interface TrackedIntervalDTO {
	/** `null` while the interval is still open. */
	endMs: number | null;
	id: number;
	kind: "span" | "tag";
	labels: ProfileLabelsDTO;
	spanId?: string;
	/** Start, fractional ms since the UNIX epoch (`performance.timeOrigin + performance.now()`). */
	startMs: number;
	traceId?: string;
}
