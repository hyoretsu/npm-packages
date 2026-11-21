// Runtime-agnostic proof: runs the *built* package under plain Node (no Bun APIs) against a fake
// Pyroscope, using both the ESM and the CJS entry points. Usage: `bun run build && node scripts/node-smoke.mjs`.
/* global Buffer, console, performance, process, URL */
import { deepStrictEqual, equal as strictEqual, ok as strictOk } from "node:assert/strict";

// Local wrappers keep the lint rule about assertions outside test callbacks quiet in this plain script.
const check = { deepEqual: deepStrictEqual, equal: strictEqual, ok: strictOk };
import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const esm = await import("../dist/index.js");
const cjs = require("../dist/index.cjs");
const { decodePprof } = await import("../dist/pprof/index.js");
const otel = await import("../dist/opentelemetry/index.js");
check.equal(typeof cjs.Profiler, "function");
check.equal(typeof cjs.createProfiler, "function");
check.equal(typeof require("../dist/exporters/index.cjs").pyroscopeExporter, "function");
check.equal(typeof require("../dist/pprof/index.cjs").encodePprof, "function");
check.equal(typeof require("../dist/opentelemetry/index.cjs").createProfilerSpanProcessor, "function");

// Disabled handle: nothing configured, nothing thrown.
delete process.env.PYROSCOPE_SERVER_ADDRESS;
const disabled = await esm.startProfiling();
check.equal(disabled.enabled, false);
check.equal(await disabled.tag({ a: "b" }, () => 1), 1);

const received = [];
const server = createServer((request, response) => {
	const chunks = [];
	request.on("data", chunk => chunks.push(chunk));
	request.on("end", () => {
		received.push({ body: new Uint8Array(Buffer.concat(chunks)), url: new URL(request.url, "http://x") });
		response.end("ok");
	});
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;

function hotLoopAlpha(ms) {
	const until = performance.now() + ms;
	let x = 0;
	while (performance.now() < until) x += Math.sqrt(x + 1);
	return x;
}
function hotLoopBeta(ms) {
	const until = performance.now() + ms;
	let x = 1;
	while (performance.now() < until) x += Math.sqrt(x + 2);
	return x;
}

const SPAN_A = "a1a1a1a1a1a1a1a1";
const TRACE = "0123456789abcdef0123456789abcdef";
const profiler = new cjs.Profiler({
	appName: "node-smoke",
	pyroscopeUrl: url,
	sampleIntervalUs: 1000,
	signalHandlers: false,
});
const processor = otel.createProfilerSpanProcessor(profiler);
await profiler.start();

// Drive tracking through the structural OpenTelemetry processor, like an SDK would.
const attrs = {};
const span = {
	attributes: { "http.route": "/orders/:id" },
	kind: 1,
	setAttribute: (key, value) => {
		attrs[key] = value;
	},
	spanContext: () => ({ spanId: SPAN_A, traceId: TRACE }),
};
processor.onStart(span, {});
hotLoopAlpha(200);
processor.onEnd(span);
hotLoopBeta(100);
await profiler.stop();
server.close();

check.equal(attrs["pyroscope.profile.id"], SPAN_A);
check.ok(received.length >= 1, "no profile reached the fake Pyroscope");
check.equal(received[0].url.pathname, "/ingest");
check.equal(received[0].url.searchParams.get("format"), "pprof");
const samples = received.flatMap(entry => decodePprof(entry.body).samples);
const alpha = samples.filter(sample => sample.stack.includes("hotLoopAlpha"));
const beta = samples.filter(sample => sample.stack.includes("hotLoopBeta"));
check.ok(alpha.length > 0 && beta.length > 0, "frame names missing");
const weight = list => list.reduce((sum, sample) => sum + sample.values[0], 0);
const tagged = alpha.filter(
	s => s.labels.span_id === SPAN_A && s.labels.trace_id === TRACE && s.labels.route === "/orders/:id",
);
const ratio = weight(tagged) / weight(alpha);
check.ok(ratio > 0.95, `span labels on only ${(ratio * 100).toFixed(1)}% of the hotLoopAlpha samples`);
check.equal(
	weight(beta.filter(s => s.labels.span_id)) / weight(beta) < 0.05,
	true,
	"span labels leaked after the span ended",
);
const { lastAnchorMethod, lastAnchorUncertaintyMs } = profiler.stats().tracing;
console.log(
	`node ${process.version}: ok (${weight(alpha)} alpha samples, ${(ratio * 100).toFixed(1)}% labelled, ${received.length} push(es), clock mapping ${lastAnchorMethod} +/-${lastAnchorUncertaintyMs}ms)`,
);
