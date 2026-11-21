import { afterEach, describe, expect, it } from "bun:test";
import { createProfiler, startProfiling } from "./create";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";
import { NoopProfiler } from "./implementations/NoopProfiler";
import { Profiler } from "./implementations/Profiler";

const saved = { ...process.env };
afterEach(() => {
	for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
	Object.assign(process.env, saved);
});

describe("createProfiler / startProfiling", () => {
	it("returns a disabled no-op handle, without throwing, when nothing is configured", async () => {
		delete process.env.PYROSCOPE_SERVER_ADDRESS;
		const profiler = createProfiler();
		expect(profiler).toBeInstanceOf(NoopProfiler);
		expect(profiler.enabled).toBe(false);
		await expect(profiler.start()).resolves.toBeUndefined();
		expect(profiler.running).toBe(false);
		expect(profiler.trackSpan({ spanId: "1".repeat(16), traceId: "1".repeat(32) })()).toBeUndefined();
		expect(await profiler.tag({ a: "b" }, () => 42)).toBe(42);
		expect(profiler.stats()).toMatchObject({ running: false, streams: [] });
		await expect(profiler.stop()).resolves.toBeUndefined();
		await profiler[Symbol.asyncDispose]();
		const started = await startProfiling();
		expect(started.enabled).toBe(false);
	});

	it("creates a real profiler when PYROSCOPE_SERVER_ADDRESS is set", () => {
		process.env.PYROSCOPE_SERVER_ADDRESS = "http://127.0.0.1:4040";
		expect(createProfiler()).toBeInstanceOf(Profiler);
	});

	it("honours PROFILER_ENABLED=false even when configured", () => {
		process.env.PYROSCOPE_SERVER_ADDRESS = "http://127.0.0.1:4040";
		process.env.PROFILER_ENABLED = "false";
		expect(createProfiler().enabled).toBe(false);
	});

	it("throws ProfilerConfigError for invalid configuration", () => {
		process.env.PYROSCOPE_SERVER_ADDRESS = "http://127.0.0.1:4040";
		process.env.PYROSCOPE_UPLOAD_INTERVAL = "soon";
		expect(() => createProfiler()).toThrow(ProfilerConfigError);
	});

	it("startProfiling starts a working profiler and a second one degrades to a disabled handle", async () => {
		const first = await startProfiling({ pyroscopeUrl: "http://127.0.0.1:9", signalHandlers: false });
		try {
			expect(first.enabled).toBe(true);
			expect(first.running).toBe(true);
			const second = await startProfiling({
				pyroscopeUrl: "http://127.0.0.1:9",
				signalHandlers: false,
			});
			expect(second.enabled).toBe(false);
			expect(second.stats().lastError).toContain("another profiler is already active");
		} finally {
			await first.stop();
		}
	});

	it("Profiler requires a destination, tag validates labels", async () => {
		expect(() => new Profiler({})).toThrow(ProfilerConfigError);
		const profiler = new Profiler({ pyroscopeUrl: "http://127.0.0.1:9", signalHandlers: false });
		await expect(profiler.tag({ "bad key": "x" }, () => 1)).rejects.toBeInstanceOf(ProfilerConfigError);
		await expect(profiler.tag({ span_id: "x" }, () => 1)).rejects.toThrow(/reserved/);
		expect(await profiler.tag({ ok: "yes" }, () => 7)).toBe(7); // not running: just runs fn
	});

	it("rejects duplicate exporter names", () => {
		const exporter = { export: async () => undefined, name: "dup" };
		expect(() => new Profiler({ exporters: [exporter, exporter] })).toThrow(/duplicate exporter name/);
	});
});
