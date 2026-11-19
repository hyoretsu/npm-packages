/** Options of the pull-mode pprof request handler. */
export interface PprofPullHandlerOptionsDTO {
	defaultDurationSeconds?: number;
	maxDurationSeconds?: number;
	sampleIntervalUs?: number;
}
