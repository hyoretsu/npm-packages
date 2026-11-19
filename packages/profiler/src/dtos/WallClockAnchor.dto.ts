/** Maps the engine's profile clock to wall-clock time at a `Profiler.start` call. */
export interface WallClockAnchorDTO {
	/** Wall time (fractional ms since the UNIX epoch) corresponding to `profile.startTime`. */
	startMs: number;
	/** Half the duration of the `Profiler.start` call: the worst-case alignment error. */
	uncertaintyMs: number;
}
