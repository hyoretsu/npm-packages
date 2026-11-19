import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";
import type { WallClockAnchorDTO } from "./dtos/WallClockAnchor.dto";
import type { WallClockCalibrationDTO } from "./dtos/WallClockCalibration.dto";

/**
 * Wall-clock time with sub-millisecond precision (fractional ms since the UNIX epoch). It is
 * derived from the monotonic clock, so it never jumps while a window is being recorded.
 */
export function preciseNowMs(): number {
	return performance.timeOrigin + performance.now();
}

/** The process monotonic clock in microseconds, when the runtime exposes one (`process.hrtime`). */
export function monotonicUs(): number | undefined {
	const hrtime = typeof process === "undefined" ? undefined : process.hrtime;
	return typeof hrtime?.bigint === "function" ? Number(hrtime.bigint()) / 1_000 : undefined;
}

export interface ClockReading {
	hrUs?: number;
	wallMs: number;
}

/** Reads the monotonic and wall clocks back to back. */
export function readClocks(): ClockReading {
	const hrUs = monotonicUs();
	return { hrUs, wallMs: preciseNowMs() };
}

/** A start call longer than this is not trusted to be stamped at its midpoint. */
const FAST_CALL_MS = 5;
/** Slack for the resolution of the monotonic clocks involved. */
const HR_SLACK_US = 1_000;

export function createCalibration(before: ClockReading, after: ClockReading): WallClockCalibrationDTO {
	return {
		afterHrUs: after.hrUs,
		afterWallMs: after.wallMs,
		beforeHrUs: before.hrUs,
		beforeWallMs: before.wallMs,
		hrOffsetMs: before.hrUs === undefined ? undefined : before.wallMs - before.hrUs / 1_000,
	};
}

/**
 * Maps `profile.startTime` to wall-clock time.
 *
 * V8 (Node) stamps `startTime` on the process monotonic clock, early in the `Profiler.start` call
 * (which can take 20+ ms the first time). When `startTime` falls inside the monotonic readings
 * taken around the call, the clocks are shared and the mapping is exact. Otherwise (JavaScriptCore
 * reports epoch microseconds) a fast call is anchored at its midpoint, a slow one at its dispatch.
 */
export function resolveAnchor(
	calibration: WallClockCalibrationDTO,
	profile: CdpProfileDTO,
): WallClockAnchorDTO {
	const { beforeHrUs, afterHrUs, hrOffsetMs } = calibration;
	if (
		beforeHrUs !== undefined &&
		afterHrUs !== undefined &&
		hrOffsetMs !== undefined &&
		profile.startTime >= beforeHrUs - HR_SLACK_US &&
		profile.startTime <= afterHrUs + HR_SLACK_US
	) {
		return { method: "monotonic", startMs: profile.startTime / 1_000 + hrOffsetMs, uncertaintyMs: 0.05 };
	}
	const duration = Math.max(0, calibration.afterWallMs - calibration.beforeWallMs);
	if (duration <= FAST_CALL_MS) {
		return {
			method: "midpoint",
			startMs: calibration.beforeWallMs + duration / 2,
			uncertaintyMs: duration / 2 + 0.05,
		};
	}
	return { method: "dispatch", startMs: calibration.beforeWallMs, uncertaintyMs: duration };
}
