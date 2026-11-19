import type { Session } from "node:inspector/promises";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";
import type { PprofPullHandlerOptionsDTO } from "./dtos/PprofPullHandlerOptions.dto";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";
import { encodePprof } from "./pprof";
import { samplerRegistry } from "./registry";

/**
 * Framework-neutral, Go-compatible CPU pprof handler (`?seconds=N`) for pull-based collectors
 * (Grafana Alloy, `go tool pprof`). Pull mode owns the process-wide sampler while a request is
 * active, so it is intentionally incompatible with continuous push mode (answers 409).
 */
export function createPprofHandler(
	options: PprofPullHandlerOptionsDTO = {},
): (request: Request) => Promise<Response> {
	const sampleIntervalUs = options.sampleIntervalUs ?? 10_000;
	const defaultDuration = options.defaultDurationSeconds ?? 10;
	const maxDuration = options.maxDurationSeconds ?? 120;
	if (!(sampleIntervalUs > 0) || !(defaultDuration > 0) || !(maxDuration > 0)) {
		throw new ProfilerConfigError("pull-mode intervals must be greater than zero");
	}
	let inFlight: Promise<Uint8Array> | null = null;
	const owner = {};

	return async request => {
		const secondsValue = new URL(request.url).searchParams.get("seconds");
		const seconds = secondsValue === null ? defaultDuration : Number(secondsValue);
		if (!Number.isFinite(seconds) || seconds <= 0 || seconds > maxDuration) {
			return new Response(`seconds must be greater than 0 and at most ${maxDuration}\n`, {
				status: 400,
			});
		}
		if (!inFlight) {
			if (!samplerRegistry.acquire(owner)) {
				return new Response("continuous profiling is already active in this process\n", {
					status: 409,
				});
			}
			inFlight = capturePprof(seconds * 1_000, sampleIntervalUs).finally(() => {
				samplerRegistry.release(owner);
				inFlight = null;
			});
		}
		try {
			const data = await inFlight;
			return new Response(data as Uint8Array<ArrayBuffer>, {
				headers: {
					"Cache-Control": "no-store",
					"Content-Type": "application/octet-stream",
					"X-Content-Type-Options": "nosniff",
				},
			});
		} catch (error) {
			return new Response(`profile capture failed: ${error}\n`, { status: 500 });
		}
	};
}

async function capturePprof(durationMs: number, sampleIntervalUs: number): Promise<Uint8Array> {
	const mod = await import("node:inspector/promises");
	const session: Session = new mod.Session();
	session.connect();
	try {
		await session.post("Profiler.enable");
		await session.post("Profiler.setSamplingInterval", { interval: sampleIntervalUs });
		await session.post("Profiler.start");
		await new Promise(resolve => setTimeout(resolve, durationMs));
		const { profile } = (await session.post("Profiler.stop")) as { profile: CdpProfileDTO };
		return encodePprof(profile, {
			durationNanos: String(Math.round(durationMs * 1_000_000)),
			sampleIntervalUs,
			timeNanos: String(Date.now() * 1_000_000),
		});
	} finally {
		session.disconnect();
	}
}
