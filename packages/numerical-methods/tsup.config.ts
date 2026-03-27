import type { Options } from "tsup";

export const tsup: Options = {
	clean: true,
	dts: true,
	entry: ["src/**/*.ts"],
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "node18",
};
