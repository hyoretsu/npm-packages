/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-useless-concat */
const { build } = require("esbuild");
const { dependencies, devDependencies, peerDependencies } = require("./package.json");

const start = Date.now();

try {
	build({
		bundle: true,
		entryPoints: ["./src/"],
		external: [
			...(dependencies && Object.keys(dependencies)),
			...(devDependencies && Object.keys(devDependencies)),
			...(peerDependencies && Object.keys(peerDependencies)),
		],
		keepNames: true,
		minify: true,
		outfile: "dist/index.js",
		platform: "node",
	}).then(() => console.log("⚡ " + "\x1b[32m" + `Done in ${Date.now() - start}ms`));
} catch (e) {
	console.log(e);
	process.exit(1);
}
