import { describe, expect, it } from "bun:test";
import { sampleWallTimesMs } from "./cdp";
import { NoopProfiler } from "./implementations/NoopProfiler";
import { encodePyroscopeName, validateLabels } from "./labels";
import { createLog } from "./logger";
import { renderPrometheusMetrics } from "./metrics";
import { samplerRegistry } from "./registry";
import { MAX_RETRY_AFTER_MS, parseRetryAfter, retryDelayMs } from "./retry";
import { convertToSpeedscope } from "./speedscope";
import { makeProfile } from "./test-utils";
import { createCalibration, preciseNowMs, readClocks, resolveAnchor } from "./wall-clock";

describe("encodePyroscopeName", () => {
	it("sorts labels and escapes syntax characters in app names and values", () => {
		expect(encodePyroscopeName("@acme/api {x}", { a: "x,y", b: "2" }, "cpu")).toBe(
			"@acme/api__x_.cpu{a=x_y,b=2}",
		);
		expect(encodePyroscopeName("app", {}, null)).toBe("app");
		expect(encodePyroscopeName("app", { k: "v" }, null)).toBe("app{k=v}");
	});
});

describe("validateLabels", () => {
	it("drops invalid entries leniently and throws strictly", () => {
		expect(
			validateLabels({ "bad key": "x", empty: "", multi: "a\nb", num: 1 as never, ok: "1" }, false),
		).toEqual({ ok: "1" });
		expect(() => validateLabels({ "bad key": "x" }, true)).toThrow(/invalid label key/);
		expect(validateLabels({ a: "1", span_id: "x" }, false, ["span_id"])).toEqual({ a: "1" });
		expect(validateLabels(undefined, true)).toEqual({});
	});
});

describe("retry helpers", () => {
	it("parses Retry-After seconds and dates and caps them", () => {
		expect(parseRetryAfter("3")).toBe(3_000);
		expect(parseRetryAfter("99999")).toBe(MAX_RETRY_AFTER_MS);
		expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6_000);
		expect(parseRetryAfter("garbage")).toBeUndefined();
		expect(parseRetryAfter(null)).toBeUndefined();
	});

	it("uses exponential equal-jitter backoff and never retries before Retry-After", () => {
		expect(retryDelayMs(1, undefined, () => 0)).toBe(500);
		expect(retryDelayMs(1, undefined, () => 1)).toBe(1_000);
		expect(retryDelayMs(3, undefined, () => 0)).toBe(2_000);
		expect(retryDelayMs(20, undefined, () => 1)).toBe(30_000);
		expect(retryDelayMs(1, 5_000, () => 0)).toBe(5_000);
		expect(retryDelayMs(1, 5_000, () => 1)).toBe(5_500);
		expect(retryDelayMs(1, undefined, () => Number.NaN)).toBe(500);
	});
});

describe("logger", () => {
	it("is silent by default, uses a custom logger when given, and the console in debug", () => {
		const lines: string[] = [];
		const original = console.log;
		console.log = (line: string) => void lines.push(line);
		try {
			createLog(false)("debug", "hidden");
			createLog(true)("debug", "shown");
			createLog(false, { debug: message => lines.push(`custom:${message}`) })("debug", "x");
			createLog(false, {})("error", "ignored");
		} finally {
			console.log = original;
		}
		expect(lines).toEqual(["[@hyoretsu/profiler] [DEBUG] shown", "custom:x"]);
	});
});

describe("registry", () => {
	it("allows a single owner at a time", () => {
		const a = {};
		const b = {};
		expect(samplerRegistry.acquire(a)).toBe(true);
		expect(samplerRegistry.acquire(a)).toBe(true);
		expect(samplerRegistry.acquire(b)).toBe(false);
		expect(samplerRegistry.isHeldByOther(b)).toBe(true);
		samplerRegistry.release(b);
		expect(samplerRegistry.isHeldByOther(b)).toBe(true);
		samplerRegistry.release(a);
		expect(samplerRegistry.acquire(b)).toBe(true);
		samplerRegistry.release(b);
	});
});

describe("wall clock mapping", () => {
	it("maps cumulative timeDeltas onto the anchor in ms and clamps negative deltas", () => {
		const profile = makeProfile([
			{ deltaUs: 1_000, stack: ["a"] },
			{ deltaUs: 2_500, stack: ["a"] },
			{ deltaUs: -50, stack: ["a"] },
			{ deltaUs: 500, stack: ["a"] },
		]);
		const times = sampleWallTimesMs(profile, {
			method: "midpoint",
			startMs: 1_000_000,
			uncertaintyMs: 0.1,
		});
		expect(Array.from(times)).toEqual([1_000_001, 1_000_003.5, 1_000_003.5, 1_000_004]);
	});

	const profileAt = (startTime: number) => makeProfile([["a"]], { startTime });

	it("maps a profile on the shared monotonic clock exactly, regardless of how long the start call took", () => {
		// V8: startTime is stamped early in a slow (23 ms) first start call.
		const calibration = {
			afterHrUs: 123_023_000,
			afterWallMs: 1_000_023,
			beforeHrUs: 123_000_000,
			beforeWallMs: 1_000_000,
			hrOffsetMs: 1_000_000 - 123_000,
		};
		expect(resolveAnchor(calibration, profileAt(123_000_400))).toEqual({
			method: "monotonic",
			startMs: 1_000_000.4,
			uncertaintyMs: 0.05,
		});
	});

	it("anchors an epoch-clock profile (JavaScriptCore) at the midpoint of a fast start call", () => {
		const calibration = {
			afterHrUs: 123_000_200,
			afterWallMs: 1_000_000.2,
			beforeHrUs: 123_000_000,
			beforeWallMs: 1_000_000,
			hrOffsetMs: 877_000,
		};
		const anchor = resolveAnchor(calibration, profileAt(1_795_066_305_427_275));
		expect(anchor.method).toBe("midpoint");
		expect(anchor.startMs).toBeCloseTo(1_000_000.1, 6);
		expect(anchor.uncertaintyMs).toBeLessThan(0.2);
	});

	it("falls back to the dispatch time when the clock is unknown and the start call was slow", () => {
		expect(resolveAnchor({ afterWallMs: 1_000_030, beforeWallMs: 1_000_000 }, profileAt(5))).toEqual({
			method: "dispatch",
			startMs: 1_000_000,
			uncertaintyMs: 30,
		});
	});

	it("reads both clocks back to back and derives the offset", () => {
		const before = readClocks();
		const calibration = createCalibration(before, readClocks());
		expect(calibration.beforeWallMs).toBeLessThanOrEqual(calibration.afterWallMs);
		expect(calibration.hrOffsetMs).toBeCloseTo(before.wallMs - (before.hrUs ?? 0) / 1_000, 6);
		expect(preciseNowMs()).toBeGreaterThan(1.7e12);
	});
});

describe("renderPrometheusMetrics", () => {
	it("renders the disabled handle's stats and accepts a handle or a stats object", () => {
		const handle = new NoopProfiler();
		const text = renderPrometheusMetrics(handle);
		expect(text).toBe(renderPrometheusMetrics(handle.stats()));
		expect(text).toContain("# TYPE profiler_running gauge\nprofiler_running 0");
		expect(text).toContain("profiler_attributed_samples_total 0");
		expect(text).not.toContain("bun_profiler");
		expect(text).not.toContain("jsc_");
		expect(text.endsWith("\n")).toBe(true);
	});

	it("renders exporter labels, escaping quotes", () => {
		const stats = new NoopProfiler().stats();
		stats.exporters['we"ird'] = {
			droppedProfiles: 1,
			exportedBytes: 9,
			exportedProfiles: 2,
			failedProfiles: 0,
			inFlight: true,
			lastError: null,
			lastExportDurationMs: 500,
			lastSuccessAt: 2_000,
			queueDepth: 0,
			retries: 3,
		};
		stats.memory.jscHeapSizeBytes = 123;
		const text = renderPrometheusMetrics(stats);
		expect(text).toContain('profiler_exported_profiles_total{exporter="we\\"ird"} 2');
		expect(text).toContain('profiler_export_in_flight{exporter="we\\"ird"} 1');
		expect(text).toContain('profiler_export_last_success_unixtime{exporter="we\\"ird"} 2');
		expect(text).toContain("profiler_jsc_heap_size_bytes 123");
	});
});

describe("convertToSpeedscope", () => {
	it("emits frames and sample stacks root-first with microsecond weights", () => {
		const result = convertToSpeedscope(makeProfile([["a", "b"], ["a"]]), "svc") as {
			profiles: Array<{ samples: number[][]; weights: number[] }>;
			shared: { frames: Array<{ name: string }> };
		};
		expect(result.shared.frames).toHaveLength(2);
		const names = result.profiles[0]?.samples.map(stack =>
			stack.map(index => result.shared.frames[index]?.name),
		);
		expect(names).toEqual([["a", "b"], ["a"]]);
		expect(result.profiles[0]?.weights).toEqual([10_000, 10_000]);
	});
});
