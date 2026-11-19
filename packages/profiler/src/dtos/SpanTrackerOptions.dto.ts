/** Memory bounds and clock of a span tracker. */
export interface SpanTrackerOptionsDTO {
	/** Hard cap on retained intervals (open + closed). Oldest are evicted first. Default: 10000. */
	maxIntervals?: number;
	/** Open intervals older than this are force-closed as orphans. Default: 300000 (5 min). */
	maxSpanAgeMs?: number;
	/** Clock returning fractional ms since the UNIX epoch. Defaults to `performance.timeOrigin + performance.now()`. */
	now?: () => number;
}
