/** Optional value an exporter may return to report what it sent. */
export interface ExportResultDTO {
	/** Bytes written/sent for this window (counted in `ExporterStats.exportedBytes`). */
	bytes?: number;
}
