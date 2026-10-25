// Distribute the Bun formatter section for consumers to copy into their bunfig.toml.
await Bun.write(
	new URL("../dist/bunfig.toml", import.meta.url),
	Bun.file(new URL("../src/bunfig.toml", import.meta.url)),
);
