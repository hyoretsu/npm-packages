const { build } = require("esbuild");

const start = Date.now();

try {
	build({
		bundle: true,
		entryPoints: ["./src"],
		external: ["./node_modules/*"],
		keepNames: true,
		minify: true,
		outfile: "dist/index.js",
		platform: "node",
	}).then(() => console.log("⚡ " + "\x1b[32m" + `Done in ${Date.now() - start}ms`));
} catch (e) {
	console.log(e);
	process.exit(1);
}
