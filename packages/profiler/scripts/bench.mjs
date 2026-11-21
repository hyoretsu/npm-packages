// Indicative overhead micro-benchmark (profiler OFF vs ON). Runs each case in a fresh process.
//   bun run build && bun scripts/bench.mjs [reps]        (also works with `node`)
/* global console, fetch, performance, process */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);

function fib(n) {
	return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

async function child(mode, workload) {
	let profiler;
	let sink;
	if (mode !== "off") {
		sink = createServer((request, response) => {
			request.resume();
			request.on("end", () => response.end("ok"));
		});
		await new Promise(resolve => sink.listen(0, "127.0.0.1", resolve));
		const { Profiler } = await import("../dist/index.js");
		profiler = new Profiler({
			appName: "bench",
			pushIntervalMs: 2_000,
			pyroscopeUrl: `http://127.0.0.1:${sink.address().port}`,
			sampleIntervalUs: 10_000,
			signalHandlers: false,
		});
		await profiler.start();
	}
	let result;
	if (workload === "cpu") {
		fib(27); // warm-up
		const started = performance.now();
		for (let i = 0; i < 40; i++) fib(30);
		result = { ms: performance.now() - started };
	} else {
		const handler = async () => {
			const end =
				mode === "on"
					? profiler?.trackSpan({
							labels: { route: "/bench" },
							spanId: "a".repeat(16),
							traceId: "b".repeat(32),
						})
					: undefined;
			let acc = 0;
			for (let i = 0; i < 20_000; i++) acc += Math.sqrt(i);
			const body = JSON.stringify({
				acc,
				items: Array.from({ length: 50 }, (_, i) => ({ i, v: i * 2 })),
			});
			end?.();
			return body;
		};
		const server = createServer(async (_request, response) => response.end(await handler()));
		await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
		const url = `http://127.0.0.1:${server.address().port}/`;
		const fire = async count => {
			for (let i = 0; i < count; i++) await (await fetch(url)).text();
		};
		await Promise.all(Array.from({ length: 8 }, () => fire(100))); // warm-up
		const total = 8 * 600;
		const started = performance.now();
		await Promise.all(Array.from({ length: 8 }, () => fire(600)));
		const ms = performance.now() - started;
		result = { ms, rps: (total / ms) * 1_000 };
		server.close();
	}
	await profiler?.stop();
	sink?.close();
	console.log(JSON.stringify(result));
	process.exit(0);
}

if (process.argv[2] === "child") {
	await child(process.argv[3], process.argv[4]);
} else {
	const reps = Number(process.argv[2] ?? 5);
	const stats = values => {
		const sorted = [...values].sort((a, b) => a - b);
		return { max: sorted.at(-1), median: sorted[Math.floor(sorted.length / 2)], min: sorted[0] };
	};
	for (const workload of ["cpu", "http"]) {
		const modes = (process.env.BENCH_MODES ?? "off,on").split(",");
		const runs = Object.fromEntries(modes.map(mode => [mode, []]));
		for (let rep = 0; rep < reps; rep++) {
			for (const mode of rep % 2 ? [...modes].reverse() : modes) {
				const run = spawnSync(process.execPath, [self, "child", mode, workload], {
					encoding: "utf8",
				});
				if (run.status !== 0) throw new Error(`${mode}/${workload} failed: ${run.stderr}`);
				runs[mode].push(JSON.parse(run.stdout.trim().split("\n").pop()));
			}
		}
		const metric = workload === "cpu" ? "ms" : "rps";
		const off = stats(runs.off.map(run => run[metric]));
		for (const mode of modes.filter(name => name !== "off")) {
			const on = stats(runs[mode].map(run => run[metric]));
			const overheadPct =
				workload === "cpu"
					? ((on.median - off.median) / off.median) * 100
					: ((off.median - on.median) / off.median) * 100;
			console.log(
				`${workload} ${mode} (${metric}, ${reps} reps, runtime ${process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.versions.node}`}): OFF median ${off.median.toFixed(1)} [${off.min.toFixed(1)}-${off.max.toFixed(1)}]  ${mode.toUpperCase()} median ${on.median.toFixed(1)} [${on.min.toFixed(1)}-${on.max.toFixed(1)}]  overhead ${overheadPct.toFixed(1)}%`,
			);
		}
	}
}
