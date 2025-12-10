import { merge, omit } from "es-toolkit";
import { rm } from "node:fs/promises";
import path from "node:path";
import { styleText } from "node:util";

const args = process.argv.slice(2);
if (args.length === 0 || args.length > 2) {
	console.error("Usage: bun [run] ./build/json.ts <tool>");
	process.exit(1);
}

const tool = args.at(-1)!
const lowerTool = tool.toLowerCase();

const dist = path.resolve(import.meta.dir, `../dist/${lowerTool}`);
const src = path.resolve(import.meta.dir, `../src/${lowerTool}`);

await rm(dist, { force: true, recursive: true })

type JsonObject = Record<string,any>;

const sortObjectKeys = (obj: JsonObject): any => {
	if (typeof obj !== "object") {
	return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys);
	}

	return Object.keys(obj)
	.sort()
	.reduce((sorted, key) => {
		sorted[key] = sortObjectKeys(obj[key]);
		return sorted;
	}, {} as JsonObject);
};

/** Recursively load and merge configs */
const processConfig = async (currentPath: string): Promise<JsonObject> => {
	// Bun Native: Read JSON directly
	const baseConfig = await Bun.file(currentPath).json();

	// If no 'extends', return as is
	if (!baseConfig.extends?.length) {
		return baseConfig;
	}

	const configs = await Promise.all(
		baseConfig.extends.map(async (extendedFile: string) => {
			const extendedConfig = path.resolve(src, extendedFile);
			return processConfig(extendedConfig);
		})
	);
	configs.push(baseConfig);

	let merged: JsonObject = {};

	for (const config of configs) {
		merge(merged, config);
	}

	return omit(merged, ["extends"]);
};

const files = await Array.fromAsync(new Bun.Glob("*.json").scan(src));

await Promise.all(
	files.map(async (file) => {
		const srcPath = path.join(src, file);
		const destPath = path.join(dist, file);

		// Process and Sort
		const config = await processConfig(srcPath);
		const sortedConfig = sortObjectKeys(config);

		await Bun.write(destPath, JSON.stringify(sortedConfig, null, "\t"));
	})
);

console.log(`✨ Successfully built ${styleText("bold", tool)} configuration files to './dist'`);
