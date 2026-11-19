/** Trace/route attribution of samples. */
export interface TracingOptionsDTO {
	/** Set to false to make `trackSpan`/`tag` no-ops. Default: true. */
	enabled?: boolean;
	/** Cap on retained span intervals. Default: 10000. */
	maxTrackedSpans?: number;
	/** Cap on distinct per-sample label sets per window (cardinality guard). Default: 2000. */
	maxSampleLabelSets?: number;
	/** Open spans older than this are force-closed (orphans). Default: 300000. */
	maxSpanAgeMs?: number;
}
