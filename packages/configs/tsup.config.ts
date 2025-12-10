import { defineConfig } from "tsup";

export default defineConfig({
	bundle: false,
	clean: true,
	entry: ["./src/**/*.(js|ts)"],
	esbuildOptions(options) {
		options.outbase = "./src";
	},
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "node22",
	tsconfig: "tsconfig.build.json",
});
