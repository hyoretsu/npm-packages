/** Sink for the profiler's diagnostics. Unset methods are ignored. */
export interface ProfilerLoggerDTO {
	debug?: (message: string) => void;
	error?: (message: string) => void;
	warn?: (message: string) => void;
}
