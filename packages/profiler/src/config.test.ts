import { describe, expect, it } from "bun:test";
import { hasDestination, optionsFromEnv, parseLabels, resolveConfig } from "./config";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";

describe("parseLabels", () => {
	it("parses key=value and key:value pairs", () => {
		expect(parseLabels("team=core, tier:web")).toEqual({ team: "core", tier: "web" });
		expect(parseLabels("")).toBeUndefined();
	});

	it("rejects malformed pairs, bad keys and empty values", () => {
		expect(() => parseLabels("novalue")).toThrow(ProfilerConfigError);
		expect(() => parseLabels("bad key=x")).toThrow(/invalid label key/);
		expect(() => parseLabels("a=")).toThrow(/non-empty/);
	});
});

describe("optionsFromEnv", () => {
	it("maps the PYROSCOPE_* and PROFILER_* variables", () => {
		const options = optionsFromEnv(
			{},
			{
				PROFILER_ADAPTIVE_ENABLED: "true",
				PROFILER_ADAPTIVE_IDLE_INTERVAL: "50ms",
				PROFILER_COMPRESS: "1",
				PROFILER_DEBUG: "false",
				PROFILER_MAX_RETRIES: "5",
				PROFILER_PYROSCOPE_FORMAT: "folded",
				PROFILER_SOURCE_MAPS_ENABLED: "true",
				PROFILER_TRACING_ENABLED: "false",
				PROFILER_WALL_TIME_ENABLED: "true",
				PYROSCOPE_APPLICATION_NAME: "api",
				PYROSCOPE_BASIC_AUTH_PASSWORD: "pw",
				PYROSCOPE_BASIC_AUTH_USER: "user",
				PYROSCOPE_LABELS: "team=core",
				PYROSCOPE_PROFILING_INTERVAL: "5ms",
				PYROSCOPE_SERVER_ADDRESS: "http://pyro:4040",
				PYROSCOPE_TENANT_ID: "tenant",
				PYROSCOPE_UPLOAD_INTERVAL: "30s",
			},
		);
		expect(options).toMatchObject({
			adaptiveSampling: { enabled: true, idleIntervalUs: 50_000 },
			appName: "api",
			basicAuth: { password: "pw", username: "user" },
			compress: true,
			debug: false,
			labels: { team: "core" },
			maxRetries: 5,
			pushIntervalMs: 30_000,
			pyroscopeFormat: "folded",
			pyroscopeUrl: "http://pyro:4040",
			sampleIntervalUs: 5_000,
			sourceMaps: { enabled: true },
			tenantId: "tenant",
			tracing: { enabled: false },
			wallTime: { enabled: true },
		});
	});

	it("does not read the legacy BUN_PROFILER_* names", () => {
		expect(
			optionsFromEnv({}, { BUN_PROFILER_DEBUG: "true", BUN_PROFILER_MAX_RETRIES: "9" }).maxRetries,
		).toBeUndefined();
	});

	it("lets overrides win, merges labels and nested groups key by key", () => {
		const options = optionsFromEnv(
			{ labels: { b: "override" }, sourceMaps: { cacheSize: 8 } },
			{
				PROFILER_SOURCE_MAPS_ENABLED: "true",
				PYROSCOPE_LABELS: "a=1,b=env",
				PYROSCOPE_SERVER_ADDRESS: "http://env",
			},
		);
		expect(options.labels).toEqual({ a: "1", b: "override" });
		expect(options.sourceMaps).toEqual({ cacheSize: 8, enabled: true });
		expect(options.pyroscopeUrl).toBe("http://env");
		expect(
			optionsFromEnv({ pyroscopeUrl: "http://arg" }, { PYROSCOPE_SERVER_ADDRESS: "http://env" })
				.pyroscopeUrl,
		).toBe("http://arg");
	});

	it("lets an explicit auth choice replace the environment-backed alternative", () => {
		const env = { PYROSCOPE_BASIC_AUTH_PASSWORD: "pw", PYROSCOPE_BASIC_AUTH_USER: "user" };
		const options = optionsFromEnv({ authToken: "tok" }, env);
		expect(options.basicAuth).toBeUndefined();
		expect(() => resolveConfig({ ...options, pyroscopeUrl: "http://x" })).not.toThrow();
	});

	it("builds a file exporter from PROFILER_OUTPUT_DIR and validates the format", () => {
		const options = optionsFromEnv(
			{},
			{ PROFILER_OUTPUT_DIR: "/tmp/p", PROFILER_OUTPUT_FORMAT: "speedscope" },
		);
		expect(options.exporters?.map(exporter => exporter.name)).toEqual(["file-speedscope"]);
		expect(() =>
			optionsFromEnv({}, { PROFILER_OUTPUT_DIR: "/tmp/p", PROFILER_OUTPUT_FORMAT: "svg" }),
		).toThrow(/PROFILER_OUTPUT_FORMAT/);
	});

	it.each([
		[{ PROFILER_DEBUG: "maybe" }, /PROFILER_DEBUG must be true, false, 1, or 0/],
		[{ PROFILER_MAX_RETRIES: "-1" }, /PROFILER_MAX_RETRIES must be a non-negative integer/],
		[{ PROFILER_MAX_RETRIES: "1.5" }, /non-negative integer/],
		[{ PROFILER_EXPORT_TIMEOUT: "10" }, /PROFILER_EXPORT_TIMEOUT must include us, ms, s, or m/],
		[{ PYROSCOPE_UPLOAD_INTERVAL: "0s" }, /greater than zero/],
		[{ PYROSCOPE_PROFILING_INTERVAL: "fast" }, /PYROSCOPE_PROFILING_INTERVAL must include/],
		[{ PROFILER_PYROSCOPE_FORMAT: "jfr" }, /PROFILER_PYROSCOPE_FORMAT must be folded or pprof/],
		[{ PYROSCOPE_BASIC_AUTH_USER: "u" }, /must be set together/],
		[{ PYROSCOPE_LABELS: "a=1,b" }, /key=value/],
		[{ PROFILER_MAX_SAMPLE_LABEL_SETS: "abc" }, /PROFILER_MAX_SAMPLE_LABEL_SETS/],
	])("rejects invalid environment %p", (env, message) => {
		expect(() => optionsFromEnv({}, env)).toThrow(message);
		expect(() => optionsFromEnv({}, env)).toThrow(ProfilerConfigError);
	});

	it("parses durations in us, ms, s and m", () => {
		const parse = (value: string) =>
			optionsFromEnv({}, { PYROSCOPE_UPLOAD_INTERVAL: value }).pushIntervalMs;
		expect([parse("500us"), parse("250ms"), parse("2s"), parse("1m"), parse("1.5s")]).toEqual([
			0.5, 250, 2_000, 60_000, 1_500,
		]);
	});
});

describe("resolveConfig", () => {
	const base = { pyroscopeUrl: "http://localhost:4040" };

	it("applies the documented defaults (pprof, 10ms, 15s, tracing on)", () => {
		const config = resolveConfig(base);
		expect(config).toMatchObject({
			compress: false,
			debug: false,
			exportTimeoutMs: 10_000,
			maxPendingWindows: 2,
			maxRetries: 2,
			pushIntervalMs: 15_000,
			pyroscopeFormat: "pprof",
			sampleIntervalUs: 10_000,
			shutdownTimeoutMs: 10_000,
			signalHandlers: true,
			sourceMaps: { cacheSize: 64, enabled: false },
			tracing: {
				enabled: true,
				maxSampleLabelSets: 2_000,
				maxSpanAgeMs: 300_000,
				maxTrackedSpans: 10_000,
			},
			wallTime: { enabled: false },
		});
		expect(config.adaptiveSampling).toEqual({
			busyIntervalUs: 10_000,
			busyThreshold: 0.25,
			enabled: false,
			idleIntervalUs: 50_000,
		});
		expect(config.labels.service_name).toBe(config.appName);
		expect(config.labels.hostname).toBeTruthy();
	});

	it("strips a trailing slash from the URL and lets user labels win over defaults", () => {
		const config = resolveConfig({
			appName: "svc",
			labels: { hostname: "fixed" },
			pyroscopeUrl: "http://x:1/",
		});
		expect(config.pyroscopeUrl).toBe("http://x:1");
		expect(config.labels).toMatchObject({ hostname: "fixed", service_name: "svc" });
	});

	it.each([
		[{}, /pyroscopeUrl or at least one exporter/],
		[{ pyroscopeUrl: "not a url" }, /valid URL/],
		[{ pyroscopeUrl: "ftp://x" }, /http or https/],
		[{ ...base, authToken: "t", basicAuth: { password: "p", username: "u" } }, /mutually exclusive/],
		[{ ...base, basicAuth: { password: "", username: "u" } }, /both username and password/],
		[{ ...base, pyroscopeFormat: "jfr" }, /folded or pprof/],
		[{ ...base, tenantId: "a\nb" }, /tenantId/],
		[{ ...base, labels: { "bad key": "x" } }, /invalid label key/],
		[{ ...base, labels: { a: "" } }, /non-empty single-line/],
		[{ ...base, labels: { span_id: "x" } }, /reserved/],
		[{ ...base, sampleIntervalUs: 0 }, /sampleIntervalUs/],
		[{ ...base, sampleIntervalUs: 1.5 }, /sampleIntervalUs must be an integer/],
		[{ ...base, pushIntervalMs: Number.NaN }, /pushIntervalMs/],
		[{ ...base, maxRetries: -1 }, /maxRetries/],
		[{ ...base, maxPendingWindows: 0 }, /maxPendingWindows/],
		[{ ...base, adaptiveSampling: { busyThreshold: 2 } }, /busyThreshold/],
		[{ ...base, tracing: { maxTrackedSpans: 0 } }, /tracing.maxTrackedSpans/],
		[{ ...base, tracing: { maxSampleLabelSets: -1 } }, /tracing.maxSampleLabelSets/],
		[{ ...base, headers: { "Content-Type": "x" } }, /managed by the profiler/],
		[{ ...base, headers: { "bad header": "x" } }, /invalid HTTP header name/],
		[{ ...base, headers: { "X-Ok": "a\nb" } }, /without newlines/],
		[{ ...base, appName: "  " }, /appName must not be empty/],
	])("rejects invalid options %p", (options, message) => {
		expect(() => resolveConfig(options as never)).toThrow(message);
		expect(() => resolveConfig(options as never)).toThrow(ProfilerConfigError);
	});

	it("accepts exporters without a URL", () => {
		const exporter = { export: async () => undefined, name: "custom" };
		expect(hasDestination({ exporters: [exporter] })).toBe(true);
		expect(hasDestination({})).toBe(false);
		expect(resolveConfig({ exporters: [exporter] }).pyroscopeUrl).toBeUndefined();
	});
});
