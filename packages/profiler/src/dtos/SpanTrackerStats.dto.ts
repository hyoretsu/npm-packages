/** Counters of a span tracker. */
export interface SpanTrackerStatsDTO {
	/** Currently open intervals. */
	activeIntervals: number;
	/** Intervals dropped because `maxIntervals` was reached. */
	evictedIntervals: number;
	/** Spans rejected because of malformed trace/span ids. */
	invalidSpans: number;
	/** Open intervals force-closed because they exceeded `maxSpanAgeMs` (end was never called). */
	orphanedIntervals: number;
	/** Open + closed intervals currently retained. */
	retainedIntervals: number;
}
