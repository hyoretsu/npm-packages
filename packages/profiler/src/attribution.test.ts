import { describe, expect, it } from "bun:test";
import { attributeSamples } from "./attribution";
import type { TrackedIntervalDTO } from "./dtos/TrackedInterval.dto";

const T = "a".repeat(32);
const S1 = "1".repeat(16);
const S2 = "2".repeat(16);

const span = (
	id: number,
	spanId: string,
	startMs: number,
	endMs: number | null,
	labels = {},
): TrackedIntervalDTO => ({
	endMs,
	id,
	kind: "span",
	labels,
	spanId,
	startMs,
	traceId: T,
});
const times = (...values: number[]) => Float64Array.from(values);
const resolved = (result: ReturnType<typeof attributeSamples>) =>
	Array.from(result.assignment?.indices ?? []).map(index =>
		index < 0 ? null : result.assignment?.sets[index],
	);

describe("attributeSamples", () => {
	it("attaches span_id, trace_id and extra labels when exactly one span is active", () => {
		const result = attributeSamples(times(5, 15, 25), [span(1, S1, 10, 20, { route: "/x" })], 100);
		expect(resolved(result)).toEqual([null, { route: "/x", span_id: S1, trace_id: T }, null]);
		expect(result.stats).toMatchObject({ ambiguous: 0, attributed: 1, unattributed: 2 });
	});

	it("attaches only labels identical across overlapping spans, never ids", () => {
		const result = attributeSamples(
			times(12, 17, 22),
			[
				span(1, S1, 10, 20, { route: "/x", user: "a" }),
				span(2, S2, 15, 25, { route: "/x", user: "b" }),
			],
			100,
		);
		expect(resolved(result)).toEqual([
			{ route: "/x", span_id: S1, trace_id: T, user: "a" },
			{ route: "/x" },
			{ route: "/x", span_id: S2, trace_id: T, user: "b" },
		]);
		expect(result.stats.ambiguous).toBe(1);
	});

	it("attaches nothing when overlapping spans share no label", () => {
		const result = attributeSamples(
			times(5),
			[span(1, S1, 0, 10, { a: "1" }), span(2, S2, 0, 10, { a: "2" })],
			100,
		);
		expect(result.assignment).toBeUndefined();
	});

	it("treats open intervals as still active and honours inclusive boundaries", () => {
		const result = attributeSamples(times(10, 1_000_000), [span(1, S1, 10, null)], 100);
		expect(resolved(result).every(set => set?.span_id === S1)).toBe(true);
	});

	it("merges tag labels with the span's, tags winning conflicts, without touching ids", () => {
		const tag: TrackedIntervalDTO = {
			endMs: 20,
			id: 2,
			kind: "tag",
			labels: { job: "sync", route: "/override" },
			startMs: 0,
		};
		const result = attributeSamples(times(5, 12), [span(1, S1, 10, 30, { route: "/x" }), tag], 100);
		expect(resolved(result)).toEqual([
			{ job: "sync", route: "/override" },
			{ job: "sync", route: "/override", span_id: S1, trace_id: T },
		]);
	});

	it("caps distinct label sets: new span ids lose their ids first, then the sample is dropped", () => {
		const intervals = [
			span(1, S1, 0, 10, { route: "/a" }),
			span(2, S2, 5, 10, { route: "/a" }),
			span(3, "3".repeat(16), 20, 30, { route: "/a" }),
			span(4, "4".repeat(16), 40, 50, { route: "/b" }),
		];
		// t=2: span 1 only -> set 0 (with ids). t=7: spans 1+2 -> set 1 {route:/a}. Cap (2) reached.
		// t=25: span 3 would be a new set; stripped of ids it is {route:/a} = set 1. t=45: {route:/b} is new and the cap is full.
		const result = attributeSamples(times(2, 7, 25, 45), intervals, 2);
		expect(result.assignment?.sets).toHaveLength(2);
		expect(resolved(result)).toEqual([
			{ route: "/a", span_id: S1, trace_id: T },
			{ route: "/a" },
			{ route: "/a" },
			null,
		]);
		expect(result.stats.cardinalityLimited).toBe(2);
	});

	it("handles no intervals / no samples", () => {
		expect(attributeSamples(times(1, 2), [], 10).assignment).toBeUndefined();
		expect(attributeSamples(times(), [span(1, S1, 0, 1)], 10).assignment).toBeUndefined();
	});
});
