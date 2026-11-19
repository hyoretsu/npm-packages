import type { SampleLabelAssignmentDTO } from "./SampleLabelAssignment.dto";

/** Options of `encodePprof`. */
export interface PprofEncodeOptionsDTO {
	/** Gzip the output. Default: true. */
	compress?: boolean;
	/** Profile duration in nanoseconds. Defaults to the CDP duration. */
	durationNanos?: string | number;
	/** Per-sample labels (`span_id`, `trace_id`, `route`, ...). */
	sampleLabels?: SampleLabelAssignmentDTO;
	sampleIntervalUs?: number;
	/** UNIX time in nanoseconds. Defaults to the current time. */
	timeNanos?: string | number;
}
