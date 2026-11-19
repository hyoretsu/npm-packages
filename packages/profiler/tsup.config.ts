import type { Options } from "tsup";

const shared: Options = {
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "node18",
};

export const tsup: Options[] = [
	{
		...shared,
		clean: true,
		dts: true,
		entry: {
			"exporters/index": "src/exporters/index.ts",
			index: "src/index.ts",
			"opentelemetry/index": "src/opentelemetry/index.ts",
			"pprof/index": "src/pprof/index.ts",
			preload: "src/preload.ts",
		},
		format: ["cjs", "esm"],
	},
	{
		// The CLI resolves ./preload.js through import.meta.url, so it is ESM only.
		...shared,
		clean: false,
		dts: false,
		entry: { cli: "src/cli.ts" },
		format: ["esm"],
	},
];
