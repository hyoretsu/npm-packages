const { build } = require("esbuild");
const { dependencies } = require("./package.json");

const start = Date.now();

try {
    build({
        bundle: true,
        entryPoints: ["./src"],
        external: Object.keys(dependencies),
        keepNames: true,
        minify: true,
        outfile: "dist/index.js",
        platform: "node",
        // rome-ignore lint/style/useTemplate: <explanation>
    }).then(() => console.log("⚡ " + "\x1b[32m" + `Done in ${Date.now() - start}ms`));
} catch (e) {
    console.log(e);
    process.exit(1);
}
