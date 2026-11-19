import { createProfiler } from "./create";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";
import type { ProfilerHandle } from "./models/ProfilerHandle";

/**
 * Side-effect entry point: `bun --preload @hyoretsu/profiler/preload app.ts` or
 * `node --import @hyoretsu/profiler/preload app.js`. Configuration comes entirely from the
 * environment (`PYROSCOPE_*`, `PROFILER_*`); without a destination it does nothing. A final partial
 * window is flushed on `beforeExit`. Output is silent unless `PROFILER_DEBUG=true`; invalid
 * configuration is reported once on stderr and profiling is skipped (the app keeps running).
 */
const PRELOAD_INSTANCE = Symbol.for("@hyoretsu/profiler.preload-instance");
const state = globalThis as typeof globalThis & { [PRELOAD_INSTANCE]?: ProfilerHandle };

function init(): ProfilerHandle | undefined {
	let profiler: ProfilerHandle;
	try {
		profiler = createProfiler();
	} catch (error) {
		if (error instanceof ProfilerConfigError) {
			console.error(error.message);
			return undefined;
		}
		throw error;
	}
	if (!profiler.enabled) return profiler;
	let stopping = false;
	const flushBeforeExit = () => {
		if (stopping) return;
		stopping = true;
		process.removeListener("beforeExit", flushBeforeExit);
		void profiler.stop().catch(() => undefined);
	};
	process.on("beforeExit", flushBeforeExit);
	const debug = ["1", "true"].includes((process.env.PROFILER_DEBUG ?? "").toLowerCase());
	profiler.start().catch(error => {
		if (debug) console.error(`[@hyoretsu/profiler] preload failed: ${error}`);
	});
	return profiler;
}

state[PRELOAD_INSTANCE] ??= init();

export default state[PRELOAD_INSTANCE];
