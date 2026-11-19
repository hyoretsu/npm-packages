/** Health counters of one exporter queue. */
export interface ExporterStatsDTO {
	droppedProfiles: number;
	exportedBytes: number;
	exportedProfiles: number;
	failedProfiles: number;
	inFlight: boolean;
	lastError: string | null;
	lastExportDurationMs: number | null;
	lastSuccessAt: number | null;
	queueDepth: number;
	retries: number;
}
