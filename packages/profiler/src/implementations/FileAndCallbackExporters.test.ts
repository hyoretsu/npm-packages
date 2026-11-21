import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodePprof } from "../pprof";
import { makeProfile, makeWindow } from "../test-utils";
import { CallbackExporter, callbackExporter } from "./CallbackExporter";
import { PprofFileExporter, pprofFileExporter } from "./PprofFileExporter";

const dirs: string[] = [];
afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })));
});
const tmp = async () => {
	const dir = await mkdtemp(join(tmpdir(), "profiler-test-"));
	dirs.push(dir);
	return dir;
};

const window = makeWindow(makeProfile([["main", "work"], ["main"]]), {
	appName: "@acme/api",
	sampleLabels: { indices: Int32Array.from([0, -1]), sets: [{ route: "/x" }] },
});

describe("PprofFileExporter", () => {
	it("writes gzip pprof (.pb.gz) with per-sample labels and sanitized, sequenced names", async () => {
		const directory = join(await tmp(), "nested", "out");
		const exporter = pprofFileExporter({ directory });
		expect(exporter.name).toBe("file-pprof");
		const first = await exporter.export(window);
		await exporter.export(window);
		const files = (await readdir(directory)).sort();
		expect(files).toEqual(["_acme_api-1700000000-0.pb.gz", "_acme_api-1700000000-1.pb.gz"]);
		expect(first).toMatchObject({ bytes: expect.any(Number) });
		const decoded = decodePprof(new Uint8Array(await readFile(join(directory, files[0] as string))));
		expect(decoded.samples.some(sample => sample.labels.route === "/x")).toBe(true);
	});

	it("writes .cpuprofile and speedscope JSON, and skips non-cpu windows", async () => {
		const directory = await tmp();
		await new PprofFileExporter({ directory, format: "cpuprofile" }).export(window);
		await new PprofFileExporter({ directory, format: "speedscope" }).export(window);
		await new PprofFileExporter({ directory }).export({ ...window, type: "wall" });
		const files = (await readdir(directory)).sort();
		expect(files).toHaveLength(2);
		const cpuprofile = JSON.parse(
			await readFile(join(directory, files.find(f => f.endsWith(".cpuprofile")) as string), "utf8"),
		);
		expect(cpuprofile.nodes.length).toBeGreaterThan(1);
		const speedscope = JSON.parse(
			await readFile(
				join(directory, files.find(f => f.endsWith(".speedscope.json")) as string),
				"utf8",
			),
		);
		expect(speedscope.profiles[0]).toMatchObject({ type: "sampled", unit: "microseconds" });
		expect(speedscope.shared.frames.map((frame: { name: string }) => frame.name).toSorted()).toEqual([
			"main",
			"work",
		]);
	});

	it("validates options", () => {
		expect(() => pprofFileExporter({ directory: "" })).toThrow(/directory is required/);
		expect(() => pprofFileExporter({ directory: "/x", format: "svg" as never })).toThrow(/format/);
	});
});

describe("CallbackExporter", () => {
	it("forwards windows and signals to the callback", async () => {
		const seen: unknown[] = [];
		const exporter = callbackExporter(
			"mine",
			(w, signal) => void seen.push([w.appName, signal?.aborted]),
		);
		await exporter.export(window, new AbortController().signal);
		expect(seen).toEqual([["@acme/api", false]]);
		expect(exporter).toBeInstanceOf(CallbackExporter);
	});

	it("propagates callback failures and rejects blank names", async () => {
		await expect(
			callbackExporter("x", () => Promise.reject(new Error("sink down"))).export(window),
		).rejects.toThrow("sink down");
		expect(() => callbackExporter(" ", () => undefined)).toThrow(/name must not be empty/);
	});
});
