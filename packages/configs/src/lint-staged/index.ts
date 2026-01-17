/** @type {import('lint-staged').Configuration} */

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

const lockCommands: Record<PackageManager, string> = {
	bun: "bun i --lockfile-only",
	npm: "npm i --package-lock-only",
	pnpm: "pnpm i --lockfile-only",
	yarn: "yarn install", // For Yarn Berry, use: "yarn install --mode update-lockfile"
};

export const lintStagedConfig = (packageManager?: PackageManager) => ({
	...(packageManager && {
		"(bun.|package-|pnpm-|yarn.)lock*": [() => lockCommands[packageManager]],
	}),
	"*.(cjs|js|jsx|mjs|ts|tsx)": ["bun run format:eslint"],
	"*.(css|graphql|cjs|js|jsx|mjs|json|jsonc|ts|tsx)": ["bun run format:biome"],
	"**/schema.prisma": [() => "bun run generate"],
});
