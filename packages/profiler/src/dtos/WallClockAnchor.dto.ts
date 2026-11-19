/**
 * How a profile's engine clock was mapped to wall-clock time.
 * - `monotonic`: the engine clock is the process's monotonic clock (V8 on Node): exact mapping.
 * - `midpoint`: the `Profiler.start` call was fast, so its midpoint bounds the error (JavaScriptCore on Bun).
 * - `dispatch`: slow start call, so the moment it was issued is used.
 */
export type WallClockMethodDTO = "dispatch" | "midpoint" | "monotonic";

/** Maps the engine's profile clock to wall-clock time for one window. */
export interface WallClockAnchorDTO {
	method: WallClockMethodDTO;
	/** Wall time (fractional ms since the UNIX epoch) corresponding to `profile.startTime`. */
	startMs: number;
	/** Worst-case alignment error in ms. */
	uncertaintyMs: number;
}
