/** Options of the on-disk exporter. */
export interface PprofFileExporterOptionsDTO {
	directory: string;
	/** pprof files are gzip-compressed protobuf (`.pb.gz`). Default: `pprof`. */
	format?: "cpuprofile" | "pprof" | "speedscope";
	name?: string;
}
