import { describe, expect, it } from "bun:test";
import type { OtelSpanLikeDTO } from "../dtos/OtelSpan.dto";
import type { TraceSpanDTO } from "../dtos/TraceSpan.dto";
import {
	createProfilerSpanProcessor,
	isRootOrServerSpan,
	ProfilerSpanProcessor,
} from "./ProfilerSpanProcessor";

const TRACE = "c".repeat(32);

function fakeProfiler() {
	const started: TraceSpanDTO[] = [];
	const ended: Array<Record<string, string> | undefined> = [];
	return {
		ended,
		profiler: {
			trackSpan: (span: TraceSpanDTO) => {
				started.push(span);
				return (labels?: Record<string, string>) => void ended.push(labels);
			},
		},
		started,
	};
}

function fakeSpan(
	spanId: string,
	extra: Partial<OtelSpanLikeDTO> = {},
): OtelSpanLikeDTO & { attrs: Record<string, string> } {
	const attrs: Record<string, string> = {};
	return {
		attributes: {},
		attrs,
		setAttribute: (key, value) => {
			attrs[key] = value;
		},
		spanContext: () => ({ spanId, traceId: TRACE }),
		...extra,
	};
}

describe("ProfilerSpanProcessor", () => {
	it("tracks root spans, sets pyroscope.profile.id and ends them on onEnd", () => {
		const { profiler, started, ended } = fakeProfiler();
		const processor = createProfilerSpanProcessor(profiler);
		const span = fakeSpan("1".repeat(16));
		processor.onStart(span, {});
		expect(started).toEqual([{ labels: {}, spanId: "1".repeat(16), traceId: TRACE }]);
		expect(span.attrs["pyroscope.profile.id"]).toBe("1".repeat(16));
		processor.onEnd(span);
		expect(ended).toHaveLength(1);
		processor.onEnd(span); // idempotent
		expect(ended).toHaveLength(1);
	});

	it("skips child spans by default but tracks SERVER spans even with a remote parent", () => {
		const { profiler, started } = fakeProfiler();
		const processor = new ProfilerSpanProcessor(profiler);
		const child = fakeSpan("2".repeat(16), { kind: 0, parentSpanContext: { spanId: "9".repeat(16) } });
		const legacyChild = fakeSpan("3".repeat(16), { kind: 0, parentSpanId: "9".repeat(16) });
		const server = fakeSpan("4".repeat(16), { kind: 1, parentSpanId: "9".repeat(16) });
		for (const span of [child, legacyChild, server]) processor.onStart(span);
		expect(started.map(span => span.spanId)).toEqual(["4".repeat(16)]);
		expect(child.attrs).toEqual({});
		expect(isRootOrServerSpan(fakeSpan("5".repeat(16)))).toBe(true);
		expect(isRootOrServerSpan(child)).toBe(false);
	});

	it("reads http.route at start and again at end, as the route label", () => {
		const { profiler, started, ended } = fakeProfiler();
		const processor = new ProfilerSpanProcessor(profiler);
		const early = fakeSpan("6".repeat(16), { attributes: { "http.route": "/users/:id" } });
		processor.onStart(early);
		expect(started[0]?.labels).toEqual({ route: "/users/:id" });
		const late = fakeSpan("7".repeat(16));
		processor.onStart(late);
		(late.attributes as Record<string, unknown>)["http.route"] = "/late/:id"; // instrumentations usually set it after start
		processor.onEnd(late);
		expect(ended[0]).toEqual({ route: "/late/:id" });
	});

	it("supports custom filter, attribute names and extra labels, and can disable attributes", () => {
		const { profiler, started } = fakeProfiler();
		const processor = new ProfilerSpanProcessor(profiler, {
			extraLabels: span => ({ kind: String(span.kind) }),
			filter: span => span.name === "keep",
			profileIdAttribute: false,
			routeAttribute: "url.route",
			routeLabel: "path",
		});
		const keep = fakeSpan("8".repeat(16), { attributes: { "url.route": "/r" }, kind: 1, name: "keep" });
		const drop = fakeSpan("9".repeat(16), { name: "drop" });
		processor.onStart(keep);
		processor.onStart(drop);
		expect(started).toEqual([
			{ labels: { kind: "1", path: "/r" }, spanId: "8".repeat(16), traceId: TRACE },
		]);
		expect(keep.attrs).toEqual({});
	});

	it("never throws into the app, even if the profiler or span misbehaves", async () => {
		const processor = new ProfilerSpanProcessor({
			trackSpan: () => {
				throw new Error("boom");
			},
		});
		const broken = { spanContext: () => ({}) } as unknown as OtelSpanLikeDTO;
		expect(() => processor.onStart(fakeSpan("a".repeat(16)))).not.toThrow();
		expect(() => processor.onStart(broken)).not.toThrow();
		expect(() => processor.onEnd(broken)).not.toThrow();
		await expect(processor.forceFlush()).resolves.toBeUndefined();
		await expect(processor.shutdown()).resolves.toBeUndefined();
	});
});
