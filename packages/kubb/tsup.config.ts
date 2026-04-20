import type { Options } from "tsup";
import { dependencies } from "./package.json";

const excludedDeps = new Set(["esbuild", "tsup", "typescript"]);

export const tsup: Options = {
	clean: true,
	dts: true,
	entry: ["src/**/*.ts"],
	format: ["cjs", "esm"],
	minify: true,
	noExternal: Object.keys(dependencies || {}).filter(dep => !excludedDeps.has(dep)),
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "node18",
};
