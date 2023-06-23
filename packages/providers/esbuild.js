const { build } = require("esbuild");
const { dependencies, devDependencies, peerDependencies } = require("./package.json");

const start = Date.now();

try {
	build({
		bundle: true,
		entryPoints: ["./src"],
		external: [
			...Object.keys(dependencies),
			...Object.keys(devDependencies),
			...Object.keys(peerDependencies),
		],
		keepNames: true,
		minify: true,
		outfile: "dist/index.js",
	}).then(() => console.log("⚡ " + "\x1b[32m" + `Done in ${Date.now() - start}ms`));
} catch (e) {
	console.log(e);
	process.exit(1);
}
