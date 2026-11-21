import { describe, expect, it } from "bun:test";
import { IntervalSpanTracker } from "./IntervalSpanTracker";

const TRACE = "a".repeat(32);
const id = (n: number) => n.toString(16).padStart(16, "0");

function setup(options: ConstructorParameters<typeof IntervalSpanTracker>[0] = {}) {
	let now = 1_000;
	const tracker = new IntervalSpanTracker({ now: () => now, ...options });
	return {
		advance: (ms: number) => {
			now += ms;
		},
		tracker,
	};
}

describe("IntervalSpanTracker", () => {
	it("records start/end and keeps open spans open", () => {
		const { tracker, advance } = setup();
		const end = tracker.beginSpan({ labels: { route: "/a" }, spanId: id(1), traceId: TRACE });
		advance(50);
		expect(tracker.snapshot(0, 2_000)[0]).toMatchObject({ endMs: null, startMs: 1_000 });
		end();
		expect(tracker.snapshot(0, 2_000)[0]).toMatchObject({ endMs: 1_050, labels: { route: "/a" } });
	});

	it("end is idempotent and merges late labels (valid ones only)", () => {
		const { tracker, advance } = setup();
		const end = tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		advance(10);
		end({ "bad key": "x", route: "/late", span_id: "nope" });
		advance(10);
		end({ route: "/ignored-end-time" });
		const [interval] = tracker.snapshot(0, 9_999);
		expect(interval?.endMs).toBe(1_010);
		expect(interval?.labels.route).toBe("/ignored-end-time");
		expect(interval?.labels).not.toHaveProperty("bad key");
		expect(interval?.labels).not.toHaveProperty("span_id");
	});

	it("rejects malformed ids without throwing and counts them", () => {
		const { tracker } = setup();
		const end = tracker.beginSpan({ spanId: "xyz", traceId: TRACE });
		expect(() => end()).not.toThrow();
		tracker.beginSpan({ spanId: id(1), traceId: "short" });
		expect(tracker.stats().invalidSpans).toBe(2);
		expect(tracker.snapshot(0, 9_999)).toHaveLength(0);
	});

	it("normalizes upper-case hex ids", () => {
		const { tracker } = setup();
		tracker.beginSpan({ spanId: "ABCDEF0123456789", traceId: TRACE.toUpperCase() });
		expect(tracker.snapshot(0, 9_999)[0]).toMatchObject({ spanId: "abcdef0123456789", traceId: TRACE });
	});

	it("evicts the oldest intervals first when the cap is reached, keeping active counts right", () => {
		const { tracker, advance } = setup({ maxIntervals: 3 });
		const end1 = tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		advance(1);
		tracker.beginSpan({ spanId: id(2), traceId: TRACE });
		advance(1);
		tracker.beginSpan({ spanId: id(3), traceId: TRACE });
		end1();
		expect(tracker.stats().activeIntervals).toBe(2);
		tracker.beginSpan({ spanId: id(4), traceId: TRACE }); // evicts the (closed) oldest
		expect(tracker.snapshot(0, 9_999).map(interval => interval.spanId)).toEqual([id(2), id(3), id(4)]);
		expect(tracker.stats()).toMatchObject({ activeIntervals: 3, evictedIntervals: 1 });
		tracker.beginSpan({ spanId: id(5), traceId: TRACE }); // evicts an open one
		expect(tracker.snapshot(0, 9_999).map(interval => interval.spanId)).toEqual([id(3), id(4), id(5)]);
		expect(tracker.stats()).toMatchObject({
			activeIntervals: 3,
			evictedIntervals: 2,
			retainedIntervals: 3,
		});
	});

	it("ending an already evicted span does not corrupt the active count", () => {
		const { tracker } = setup({ maxIntervals: 1 });
		const end1 = tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		tracker.beginSpan({ spanId: id(2), traceId: TRACE }); // evicts 1 while open
		end1();
		end1();
		expect(tracker.stats()).toMatchObject({ activeIntervals: 1, retainedIntervals: 1 });
	});

	it("stays correct and fast across many evictions and compactions", () => {
		const { tracker, advance } = setup({ maxIntervals: 2_000 });
		const started = performance.now();
		for (let i = 0; i < 50_000; i++) {
			tracker.beginSpan({ spanId: id(i), traceId: TRACE })();
			advance(1);
		}
		expect(performance.now() - started).toBeLessThan(2_000);
		expect(tracker.stats()).toMatchObject({
			activeIntervals: 0,
			evictedIntervals: 48_000,
			retainedIntervals: 2_000,
		});
		const kept = tracker.snapshot(0, Number.MAX_SAFE_INTEGER);
		expect(kept[0]?.spanId).toBe(id(48_000));
		expect(kept.at(-1)?.spanId).toBe(id(49_999));
	});

	it("never leaks a span whose end is never called: it is force-closed as an orphan, then pruned", () => {
		const { tracker, advance } = setup({ maxSpanAgeMs: 1_000 });
		tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		advance(5_000);
		tracker.beginSpan({ spanId: id(2), traceId: TRACE });
		expect(tracker.stats()).toMatchObject({ activeIntervals: 1, orphanedIntervals: 1 });
		expect(tracker.snapshot(0, 9_999)[0]?.endMs).toBe(2_000);
		expect(tracker.prune(3_000)).toBe(1);
		expect(tracker.stats().retainedIntervals).toBe(1);
	});

	it("a retained snapshot keeps applying after the interval is evicted or ended later", () => {
		const { tracker, advance } = setup({ maxIntervals: 1 });
		const end = tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		const snapshot = tracker.snapshot(0, 9_999);
		advance(10);
		tracker.beginSpan({ spanId: id(2), traceId: TRACE }); // evicts interval 1
		end();
		expect(snapshot[0]).toMatchObject({ endMs: 1_010, spanId: id(1) });
	});

	it("snapshot selects intervals overlapping the window, including ones closed after it ended", () => {
		const { tracker, advance } = setup();
		const endEarly = tracker.beginSpan({ spanId: id(1), traceId: TRACE }); // 1000 - 1100
		advance(100);
		endEarly();
		advance(900);
		const endLate = tracker.beginSpan({ spanId: id(2), traceId: TRACE }); // starts 2000, ends 3000
		advance(1_000);
		endLate();
		expect(tracker.snapshot(0, 500)).toHaveLength(0);
		expect(tracker.snapshot(1_050, 1_500).map(interval => interval.spanId)).toEqual([id(1)]);
		expect(tracker.snapshot(1_900, 2_100).map(interval => interval.spanId)).toEqual([id(2)]);
		expect(tracker.snapshot(3_500, 4_000)).toHaveLength(0);
	});

	it("prune keeps open intervals and recent closed ones", () => {
		const { tracker, advance } = setup();
		const end = tracker.beginSpan({ spanId: id(1), traceId: TRACE });
		tracker.beginSpan({ spanId: id(2), traceId: TRACE });
		advance(10);
		end();
		expect(tracker.prune(1_005)).toBe(0);
		expect(tracker.prune(1_011)).toBe(1);
		expect(tracker.stats()).toMatchObject({ activeIntervals: 1, retainedIntervals: 1 });
	});

	it("label-only intervals (tags) support overlapping use", () => {
		const { tracker } = setup();
		const endA = tracker.beginLabels({ job: "a" });
		const endB = tracker.beginLabels({ job: "b" });
		expect(tracker.snapshot(0, 9_999).map(interval => [interval.kind, interval.labels.job])).toEqual([
			["tag", "a"],
			["tag", "b"],
		]);
		endA();
		endB();
		expect(tracker.stats().activeIntervals).toBe(0);
	});
});
