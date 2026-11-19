import { hasDestination, optionsFromEnv } from "./config";
import type { ProfilerOptionsDTO } from "./dtos/ProfilerOptions.dto";
import { NoopProfiler } from "./implementations/NoopProfiler";
import { Profiler } from "./implementations/Profiler";
import { createLog } from "./logger";
import type { ProfilerHandle } from "./models/ProfilerHandle";

/**
 * Environment-aware factory. Options are merged over the environment (`PYROSCOPE_*`,
 * `PROFILER_*`). Without a destination (no `pyroscopeUrl`/`PYROSCOPE_SERVER_ADDRESS`, no
 * exporters) or with `PROFILER_ENABLED=false` it returns a disabled no-op handle instead of
 * throwing, so the same code runs in every environment.
 *
 * @throws ProfilerConfigError when something *is* configured but invalid.
 */
export function createProfiler(options: ProfilerOptionsDTO = {}): ProfilerHandle {
	const switchValue = process.env.PROFILER_ENABLED?.toLowerCase();
	if (switchValue === "0" || switchValue === "false") return new NoopProfiler("PROFILER_ENABLED is false");
	const merged = optionsFromEnv(options);
	if (!hasDestination(merged))
		return new NoopProfiler("no pyroscopeUrl, PYROSCOPE_SERVER_ADDRESS or exporter configured");
	return new Profiler(merged);
}

/**
 * Creates a profiler (see `createProfiler`) and starts it. Resolves to the handle once sampling is
 * active. Never throws for a missing configuration or an unsupported runtime (the handle is then
 * disabled, see `handle.stats().lastError`); throws `ProfilerConfigError` only for invalid options.
 *
 * @example
 * await using profiler = await startProfiling({ appName: "api" });
 */
export async function startProfiling(options: ProfilerOptionsDTO = {}): Promise<ProfilerHandle> {
	const profiler = createProfiler(options);
	if (!profiler.enabled) return profiler;
	try {
		await profiler.start();
		return profiler;
	} catch (error) {
		const merged = optionsFromEnv(options);
		createLog(merged.debug ?? false, merged.logger)("error", `failed to start profiling: ${error}`);
		const disabled = new NoopProfiler(String(error));
		return disabled;
	}
}
