/** Clock readings taken around a `Profiler.start` call, resolved against the profile once it is stopped. */
export interface WallClockCalibrationDTO {
	afterHrUs?: number;
	afterWallMs: number;
	beforeHrUs?: number;
	beforeWallMs: number;
	/** `wall - monotonic` in ms, sampled at the same instant as `beforeHrUs`. */
	hrOffsetMs?: number;
}
