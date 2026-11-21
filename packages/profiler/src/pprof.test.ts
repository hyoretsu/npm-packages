import { describe, expect, it } from "bun:test";
import { gunzipSync } from "node:zlib";
import { decodePprof, encodePprof } from "./pprof";
import { makeProfile } from "./test-utils";

describe("pprof encode/decode", () => {
	const profile = makeProfile([["main", "work"], ["main", "work"], ["main", "other"], ["(idle)"]]);

	it("is gzip-compressed by default and raw when asked", () => {
		const gz = encodePprof(profile, { timeNanos: "1700000000000000000" });
		expect([gz[0], gz[1]]).toEqual([0x1f, 0x8b]);
		const raw = encodePprof(profile, { compress: false, timeNanos: "1700000000000000000" });
		expect(Array.from(gunzipSync(gz))).toEqual(Array.from(raw));
	});

	it("round-trips string table, sample types, period, times and aggregated samples", () => {
		const decoded = decodePprof(
			encodePprof(profile, {
				durationNanos: "15000000000",
				sampleIntervalUs: 10_000,
				timeNanos: "1700000000123456789",
			}),
		);
		expect(decoded.stringTable[0]).toBe("");
		expect(decoded.stringTable).toContain("main");
		expect(decoded.stringTable).toContain("file:///app/src/handler.ts");
		expect(decoded.sampleTypes).toEqual([
			{ type: "samples", unit: "count" },
			{ type: "cpu", unit: "nanoseconds" },
		]);
		expect(decoded.periodType).toEqual({ type: "cpu", unit: "nanoseconds" });
		expect(decoded.period).toBe("10000000");
		expect(decoded.timeNanos).toBe("1700000000123456789");
		expect(decoded.durationNanos).toBe("15000000000");
		const stacks = Object.fromEntries(
			decoded.samples.map(sample => [sample.stack.join("<"), sample.values]),
		);
		expect(stacks).toEqual({
			"other<main": [1, 10_000_000],
			"work<main": [2, 20_000_000],
		});
	});

	it("keeps column/line information on locations", () => {
		const decoded = decodePprof(encodePprof(profile));
		expect(decoded.functions.find(fn => fn.name === "main")).toMatchObject({ startLine: 10 });
		expect(decoded.locations[0]?.lines[0]).toMatchObject({ column: 1, line: 10 });
	});

	it("writes per-sample labels and keeps samples with different labels separate", () => {
		const labeled = makeProfile([
			["main", "work"],
			["main", "work"],
			["main", "work"],
		]);
		const decoded = decodePprof(
			encodePprof(labeled, {
				sampleLabels: {
					indices: Int32Array.from([0, 1, -1]),
					sets: [
						{ route: "/a", span_id: "aaaaaaaaaaaaaaaa", trace_id: "a".repeat(32) },
						{ span_id: "bbbbbbbbbbbbbbbb" },
					],
				},
			}),
		);
		expect(decoded.samples).toHaveLength(3);
		const labels = decoded.samples.map(sample => sample.labels);
		expect(labels).toContainEqual({ route: "/a", span_id: "aaaaaaaaaaaaaaaa", trace_id: "a".repeat(32) });
		expect(labels).toContainEqual({ span_id: "bbbbbbbbbbbbbbbb" });
		expect(labels).toContainEqual({});
		for (const key of ["route", "span_id", "trace_id", "/a"]) expect(decoded.stringTable).toContain(key);
	});

	it("aggregates identical stack+label samples into one pprof sample", () => {
		const labeled = makeProfile([["main"], ["main"], ["main"]]);
		const decoded = decodePprof(
			encodePprof(labeled, {
				sampleLabels: { indices: Int32Array.from([0, 0, 0]), sets: [{ route: "/a" }] },
			}),
		);
		expect(decoded.samples).toHaveLength(1);
		expect(decoded.samples[0]?.values[0]).toBe(3);
	});

	it("rejects truncated payloads", () => {
		const raw = encodePprof(profile, { compress: false });
		expect(() => decodePprof(raw.subarray(0, raw.length - 3))).toThrow();
	});
});
