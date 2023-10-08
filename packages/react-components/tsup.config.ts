import linaria from "@linaria/esbuild";
import type { Options } from "tsup";

export const tsup: Options = {
	clean: true,
	entry: ["src/**/*.ts"],
	esbuildPlugins: [linaria()],
	dts: true,
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "es5",
};
