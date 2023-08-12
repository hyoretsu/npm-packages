import type { Options } from "tsup";

export const tsup: Options = {
	clean: true,
	entry: ["src/index.ts"],
	dts: true,
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "es6",
};
