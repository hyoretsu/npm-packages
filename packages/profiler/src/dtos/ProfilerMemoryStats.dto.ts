/** Process memory metrics. `jsc*` values are present only under Bun (guarded `bun:jsc.heapStats`). */
export interface ProfilerMemoryStatsDTO {
	externalBytes: number;
	heapTotalBytes: number;
	heapUsedBytes: number;
	jscExtraMemorySizeBytes?: number;
	jscHeapCapacityBytes?: number;
	jscHeapSizeBytes?: number;
	rssBytes: number;
}
