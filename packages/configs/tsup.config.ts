import { defineConfig } from "tsup";

export default defineConfig({
	bundle: false,
	clean: true,
	entry: ["./src/**/*.(js|ts)"],
	esbuildOptions(options) {
		options.outbase = "./src";
	},
	// Collapse the __esModule/`.default` interop wrapper in the CJS output so
	// `require("@hyoretsu/configs/x")` (and Node's synthetic-ESM `import()` of
	// the .cjs file, which commitlint's resolve-extends uses) both get the
	// config object directly instead of one extra level of `.default` nesting.
	footer: ({ format }) => (format === "cjs" ? { js: "module.exports = module.exports.default;" } : {}),
	format: ["cjs", "esm"],
	minify: true,
	outDir: "dist",
	skipNodeModulesBundle: true,
	target: "node22",
	tsconfig: "tsconfig.build.json",
});
