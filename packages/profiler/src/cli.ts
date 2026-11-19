#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function usage(): never {
	console.error(`Usage:
  profiler run [--out DIR] [--format pprof|cpuprofile|speedscope] -- script.ts [args...]

Runs a script under Node or Bun with the profiler preloaded. Pushes to PYROSCOPE_SERVER_ADDRESS
and/or writes profiles to DIR. Configuration: PYROSCOPE_* and PROFILER_* environment variables.`);
	process.exit(2);
}

async function run(): Promise<void> {
	const [command, ...args] = process.argv.slice(2);
	if (command !== "run") usage();

	let outputDirectory: string | undefined;
	let format: string | undefined;
	let separator = args.indexOf("--");
	if (separator < 0) separator = args.findIndex(arg => !arg.startsWith("--"));
	const flags = separator < 0 ? args : args.slice(0, separator);
	const target = separator < 0 ? [] : args.slice(separator + (args[separator] === "--" ? 1 : 0));
	for (let i = 0; i < flags.length; i++) {
		if (flags[i] === "--out") outputDirectory = flags[++i];
		else if (flags[i] === "--format") format = flags[++i];
		else usage();
	}
	if (target.length === 0) usage();
	if (!process.env.PYROSCOPE_SERVER_ADDRESS && !outputDirectory) {
		throw new Error("set PYROSCOPE_SERVER_ADDRESS or pass --out DIR");
	}

	const preload = fileURLToPath(new URL("./preload.js", import.meta.url));
	// Bun preloads with --preload; Node with --import (an ES module).
	const preloadFlag = process.versions.bun ? "--preload" : "--import";
	const child = spawn(process.execPath, [preloadFlag, preload, ...target], {
		env: {
			...process.env,
			...(outputDirectory ? { PROFILER_OUTPUT_DIR: outputDirectory } : {}),
			...(format ? { PROFILER_OUTPUT_FORMAT: format } : {}),
		},
		stdio: "inherit",
	});
	process.exitCode = await new Promise<number>((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", status => resolve(status ?? 1));
	});
}

run().catch(error => {
	console.error(`[@hyoretsu/profiler] ${error instanceof Error ? error.message : error}`);
	process.exitCode = 1;
});
