import type { WallClockAnchorDTO } from "./dtos/WallClockAnchor.dto";

/**
 * Wall-clock time with sub-millisecond precision (fractional ms since the UNIX epoch). It is
 * derived from the monotonic clock, so it never jumps while a window is being recorded.
 */
export function preciseNowMs(): number {
	return performance.timeOrigin + performance.now();
}

/**
 * Anchor for a `Profiler.start` call measured between `beforeMs` and `afterMs`. The engine stamps
 * `profile.startTime` somewhere inside the call; the midpoint bounds the error by half its duration.
 */
export function createAnchor(beforeMs: number, afterMs: number): WallClockAnchorDTO {
	return { startMs: (beforeMs + afterMs) / 2, uncertaintyMs: Math.max(0, (afterMs - beforeMs) / 2) };
}
