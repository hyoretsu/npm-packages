import { describe, expect, it } from "bun:test";
import { Profiler } from "./implementations/Profiler";
import { decodePprof } from "./pprof";
import { createPprofHandler } from "./pull-handler";

const request = (query = "") => new Request(`http://localhost/debug/pprof/profile${query}`);

function spin(ms: number): number {
	const until = performance.now() + ms;
	let x = 0;
	while (performance.now() < until) x += Math.sqrt(x + 1);
	return x;
}

describe("createPprofHandler", () => {
	it("validates the seconds parameter", async () => {
		const handler = createPprofHandler({ maxDurationSeconds: 5 });
		expect((await handler(request("?seconds=0"))).status).toBe(400);
		expect((await handler(request("?seconds=abc"))).status).toBe(400);
		expect((await handler(request("?seconds=6"))).status).toBe(400);
	});

	it("rejects invalid handler options", () => {
		expect(() => createPprofHandler({ sampleIntervalUs: 0 })).toThrow(/greater than zero/);
	});

	it("returns a decodable gzip pprof for a short capture and coalesces concurrent requests", async () => {
		const handler = createPprofHandler({ sampleIntervalUs: 1_000 });
		const first = handler(request("?seconds=0.5"));
		const second = handler(request("?seconds=0.5"));
		await new Promise(resolve => setTimeout(resolve, 100)); // let the sampler start
		spin(200);
		const [a, b] = await Promise.all([first, second]);
		expect(a.status).toBe(200);
		expect(a.headers.get("cache-control")).toBe("no-store");
		const decoded = decodePprof(new Uint8Array(await a.arrayBuffer()));
		expect(decoded.sampleTypes[1]).toEqual({ type: "cpu", unit: "nanoseconds" });
		expect(decoded.samples.length).toBeGreaterThan(0);
		expect(b.status).toBe(200);
	});

	it("answers 409 while continuous profiling owns the sampler", async () => {
		const profiler = new Profiler({ pyroscopeUrl: "http://127.0.0.1:9", signalHandlers: false });
		await profiler.start();
		try {
			expect((await createPprofHandler()(request("?seconds=1"))).status).toBe(409);
		} finally {
			await profiler.stop();
		}
	});
});
