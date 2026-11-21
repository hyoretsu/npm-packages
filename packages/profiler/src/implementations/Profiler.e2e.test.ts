import { afterEach, describe, expect, it } from "bun:test";
import type { DecodedPprofDTO } from "../dtos/DecodedPprof.dto";
import { ProfilerConcurrencyError } from "../errors/ProfilerConcurrencyError";
import { decodePprof } from "../pprof";
import { Profiler } from "./Profiler";

interface Received {
	body: Uint8Array;
	headers: Headers;
	url: URL;
}

function fakePyroscope() {
	const received: Received[] = [];
	const server = Bun.serve({
		fetch: async request => {
			received.push({
				body: new Uint8Array(await request.arrayBuffer()),
				headers: request.headers,
				url: new URL(request.url),
			});
			return new Response("ok");
		},
		port: 0,
	});
	return {
		decoded: (): DecodedPprofDTO[] => received.map(entry => decodePprof(entry.body)),
		received,
		server,
		url: `http://127.0.0.1:${server.port}`,
	};
}

const T1 = "1".repeat(32);
const T2 = "2".repeat(32);
const S1 = "a1".repeat(8);
const S2 = "b2".repeat(8);

// Each loop is its own function body: JavaScriptCore inlines thin wrappers, which would hide the names.
function hotLoopAlpha(ms: number): number {
	const until = performance.now() + ms;
	let x = 0;
	while (performance.now() < until) x += Math.sqrt(x + 1);
	return x;
}
function hotLoopBeta(ms: number): number {
	const until = performance.now() + ms;
	let x = 1;
	while (performance.now() < until) x += Math.sqrt(x + 2);
	return x;
}
function untrackedWork(ms: number): number {
	const until = performance.now() + ms;
	let x = 2;
	while (performance.now() < until) x += Math.sqrt(x + 3);
	return x;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let profiler: Profiler | undefined;
let pyroscope: ReturnType<typeof fakePyroscope> | undefined;
afterEach(async () => {
	await profiler?.stop();
	pyroscope?.server.stop(true);
	profiler = undefined;
	pyroscope = undefined;
});

function start(options: Partial<ConstructorParameters<typeof Profiler>[0]> = {}) {
	pyroscope = fakePyroscope();
	profiler = new Profiler({
		appName: "e2e-app",
		labels: { team: "core" },
		pushIntervalMs: 60_000,
		pyroscopeUrl: pyroscope.url,
		sampleIntervalUs: 1_000,
		signalHandlers: false,
		...options,
	});
	return { profiler, pyroscope };
}

const samplesWith = (
	profiles: DecodedPprofDTO[],
	predicate: (sample: DecodedPprofDTO["samples"][number]) => boolean,
) => profiles.flatMap(profile => profile.samples).filter(predicate);

describe("Profiler end to end (real inspector sampler + fake Pyroscope)", () => {
	it("pushes pprof with readable frames and span_id/trace_id/route labels bound to the right spans", async () => {
		const { profiler: p, pyroscope: py } = start();
		await p.start();

		const endA = p.trackSpan({ labels: { route: "/alpha" }, spanId: S1, traceId: T1 });
		hotLoopAlpha(150);
		endA();
		untrackedWork(60);
		const endB = p.trackSpan({ labels: { route: "/beta" }, spanId: S2, traceId: T2 });
		hotLoopBeta(150);
		endB();

		await p.stop();

		expect(py.received.length).toBeGreaterThanOrEqual(1);
		const first = py.received[0] as Received;
		expect(first.url.pathname).toBe("/ingest");
		expect(first.url.searchParams.get("format")).toBe("pprof");
		expect(first.url.searchParams.get("name")).toStartWith("e2e-app{");
		expect(first.url.searchParams.get("name")).toContain("team=core");
		expect(first.headers.get("content-encoding")).toBe("gzip");
		expect(Number(first.url.searchParams.get("until"))).toBeGreaterThan(
			Number(first.url.searchParams.get("from")),
		);

		const profiles = py.decoded();
		const alpha = samplesWith(profiles, s => s.stack.includes("hotLoopAlpha"));
		const beta = samplesWith(profiles, s => s.stack.includes("hotLoopBeta"));
		const untracked = samplesWith(profiles, s => s.stack.includes("untrackedWork"));
		expect(alpha.length).toBeGreaterThan(0);
		expect(beta.length).toBeGreaterThan(0);

		const weight = (samples: typeof alpha) => samples.reduce((sum, s) => sum + (s.values[0] ?? 0), 0);
		// Allow a small sub-millisecond alignment error at span edges: >= 90% of the hot samples carry the span's labels.
		const correct = (samples: typeof alpha, spanId: string, traceId: string, route: string) =>
			weight(
				samples.filter(
					s =>
						s.labels.span_id === spanId &&
						s.labels.trace_id === traceId &&
						s.labels.route === route,
				),
			) / weight(samples);
		expect(correct(alpha, S1, T1, "/alpha")).toBeGreaterThan(0.9);
		expect(correct(beta, S2, T2, "/beta")).toBeGreaterThan(0.9);
		expect(
			samplesWith(profiles, s => s.labels.span_id === S1 && s.stack.includes("hotLoopBeta")),
		).toHaveLength(0);
		if (untracked.length > 0) {
			expect(
				weight(untracked.filter(s => s.labels.span_id === undefined)) / weight(untracked),
			).toBeGreaterThan(0.8);
		}

		const stats = p.stats();
		expect(stats.tracing.attributedSamples).toBeGreaterThan(0);
		expect(stats.tracing.activeIntervals).toBe(0);
		expect(stats.tracing.lastAnchorUncertaintyMs).toBeLessThan(5);
		expect(["midpoint", "monotonic"]).toContain(stats.tracing.lastAnchorMethod as string);
		expect(stats.exporters.pyroscope).toMatchObject({ exportedProfiles: 1, failedProfiles: 0 });
		expect(stats.exporters.pyroscope?.exportedBytes).toBeGreaterThan(0);
	});

	it("attaches only common labels while spans overlap and never leaks span ids across them", async () => {
		const { profiler: p, pyroscope: py } = start();
		await p.start();
		const endA = p.trackSpan({ labels: { route: "/shared" }, spanId: S1, traceId: T1 });
		const endB = p.trackSpan({ labels: { route: "/shared" }, spanId: S2, traceId: T2 });
		hotLoopAlpha(200);
		endA();
		endB();
		await p.stop();

		const alpha = samplesWith(py.decoded(), s => s.stack.includes("hotLoopAlpha"));
		expect(alpha.length).toBeGreaterThan(0);
		expect(alpha.every(s => s.labels.span_id === undefined && s.labels.trace_id === undefined)).toBe(
			true,
		);
		expect(alpha.filter(s => s.labels.route === "/shared").length).toBeGreaterThan(0);
		expect(p.stats().tracing.ambiguousSamples).toBeGreaterThan(0);
	});

	it("tag() under concurrency neither throws nor restarts the sampler, and labels only its own samples", async () => {
		const { profiler: p, pyroscope: py } = start();
		await p.start();
		const gapBefore = p.stats().captureFailures;

		const results = await Promise.all([
			p.tag({ job: "one" }, async () => {
				await sleep(5);
				hotLoopAlpha(120);
				return 1;
			}),
			p.tag({ job: "two" }, async () => {
				await sleep(5);
				hotLoopBeta(120);
				return 2;
			}),
			p.tag({ job: "three" }, () => 3),
		]);
		expect(results).toEqual([1, 2, 3]);
		untrackedWork(40);
		await p.stop();

		expect(p.stats().captureFailures).toBe(gapBefore);
		expect(p.stats().capturedWindows).toBe(1); // a single window: tag() did not stop/restart the sampler
		const profiles = py.decoded();
		const jobs = new Set(samplesWith(profiles, s => s.labels.job !== undefined).map(s => s.labels.job));
		expect(jobs.size).toBeGreaterThan(0);
		expect(
			samplesWith(profiles, s => s.stack.includes("untrackedWork") && s.labels.job !== undefined)
				.length,
		).toBeLessThan(samplesWith(profiles, s => s.stack.includes("untrackedWork")).length);
	});

	it("rotates windows on pushInterval and keeps attributing across the stop/start gap", async () => {
		const { profiler: p, pyroscope: py } = start({ pushIntervalMs: 250 });
		await p.start();
		const end = p.trackSpan({ labels: { route: "/long" }, spanId: S1, traceId: T1 });
		for (let i = 0; i < 6; i++) {
			hotLoopAlpha(100);
			await sleep(1);
		}
		end();
		await p.stop();
		expect(py.received.length).toBeGreaterThanOrEqual(2);
		const alpha = samplesWith(py.decoded(), s => s.stack.includes("hotLoopAlpha"));
		const labelled = alpha.filter(s => s.labels.span_id === S1);
		expect(labelled.length / alpha.length).toBeGreaterThan(0.9);
		expect(p.stats().capturedWindows).toBeGreaterThanOrEqual(2);
		expect(p.stats().tracing.retainedIntervals).toBe(0);
	});

	it("does nothing for spans tracked while stopped and survives start/stop cycles", async () => {
		const { profiler: p } = start();
		const end = p.trackSpan({ spanId: S1, traceId: T1 });
		end();
		expect(p.stats().tracing.retainedIntervals).toBe(0);
		await p.start();
		await p.stop();
		await p.start();
		expect(p.running).toBe(true);
		await p.stop();
		expect(p.running).toBe(false);
	});

	it("supports await using / Symbol.asyncDispose", async () => {
		const { profiler: p } = start();
		await p.start();
		await p[Symbol.asyncDispose]();
		expect(p.running).toBe(false);
	});

	it("allows only one sampler per process", async () => {
		const { profiler: first } = start();
		await first.start();
		const second = new Profiler({ pyroscopeUrl: "http://127.0.0.1:9", signalHandlers: false });
		await expect(second.start()).rejects.toBeInstanceOf(ProfilerConcurrencyError);
	});

	it("exports wall-time windows as folded when enabled", async () => {
		const { profiler: p, pyroscope: py } = start({ wallTime: { enabled: true } });
		await p.start();
		hotLoopAlpha(80);
		await p.stop();
		const formats = py.received.map(entry => entry.url.searchParams.get("format"));
		expect(formats).toContain("pprof");
		expect(formats).toContain("folded");
		const wall = py.received.find(entry => entry.url.searchParams.get("format") === "folded");
		expect(wall?.url.searchParams.get("name")).toContain(".wall{");
		expect(new TextDecoder().decode(wall?.body)).toContain("hotLoopAlpha");
	});

	it("never throws into the app when the destination is down, and records the failure", async () => {
		const { profiler: p, pyroscope: py } = start({ maxRetries: 0 });
		py.server.stop(true);
		await p.start();
		hotLoopAlpha(30);
		await p.stop();
		expect(p.stats().failedWindows).toBe(1);
		expect(p.stats().lastError).not.toBeNull();
	});
});
