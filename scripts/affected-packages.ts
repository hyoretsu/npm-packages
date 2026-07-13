#!/usr/bin/env bun
// For each task given, print the workspace package NAMES that should run it for this
// change set. A package qualifies for a task when (a) it defines that task script and
// (b) one of the changed files lives under its directory. Each task is evaluated on
// its own — so adding a new test type (test:integration, …) gates independently.
//
// Usage:  bun scripts/affected-packages.ts <baseRef> <task...>
// Output (stdout): compact JSON object keyed by task, e.g.
//   {"test:unit":["backend"],"test:e2e":["backend"]}
// A task with no affected package maps to []. A GitHub matrix built from [] spawns no
// jobs, so the corresponding check is skipped without needing a separate "any" flag.
//
// The workspace list is derived from the root package.json `workspaces` field, so
// adding a package needs no change here.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

interface PackageJson {
	name: string;
	workspaces?: string[];
	scripts?: Record<string, string>;
}

const [baseRef, ...tasks] = process.argv.slice(2);
if (!baseRef || tasks.length === 0) {
	console.error("usage: affected-packages.ts <baseRef> <task...>");
	process.exit(1);
}

const root: PackageJson = JSON.parse(readFileSync("package.json", "utf8"));

/** Expand the `workspaces` globs to concrete package directories. */
function workspaceDirs(): string[] {
	const dirs = new Set<string>();
	for (const pattern of root.workspaces ?? []) {
		if (pattern.endsWith("/*")) {
			const base = pattern.slice(0, -2);
			for (const entry of readdirSync(base, { withFileTypes: true })) {
				if (entry.isDirectory() && existsSync(`${base}/${entry.name}/package.json`)) {
					dirs.add(`${base}/${entry.name}`);
				}
			}
		} else if (existsSync(`${pattern}/package.json`)) {
			dirs.add(pattern);
		}
	}
	return [...dirs];
}

const packages = workspaceDirs().map(dir => {
	const pkg: PackageJson = JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
	return { dir, name: pkg.name, scripts: pkg.scripts ?? {} };
});

const changed = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: "utf8" })
	.split("\n")
	.filter(Boolean);

const isChanged = (dir: string) => changed.some(file => file === dir || file.startsWith(`${dir}/`));

const byTask = Object.fromEntries(
	tasks.map(task => [task, packages.filter(pkg => pkg.scripts[task] && isChanged(pkg.dir)).map(pkg => pkg.name)]),
);

console.log(JSON.stringify(byTask));
