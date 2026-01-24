/** @type {import('lint-staged').Configuration} */

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

const lockCommands: Record<PackageManager, string[]> = {
	bun: ["bun i --lockfile-only", "git add bun.lock"],
	npm: ["npm i --package-lock-only", "git add package-lock.json"],
	pnpm: ["pnpm i --lockfile-only", "git add pnpm-lock.yaml"],
	yarn: ["yarn install", "git add yarn.lock"], // For Yarn Berry, use: "yarn install --mode update-lockfile"
};

export const lintStagedConfig = (packageManager?: PackageManager) => ({
	...(packageManager && {
		"(bun.|package-|pnpm-|yarn.)lock*": lockCommands[packageManager],
	}),
	"*.(cjs|js|jsx|mjs|ts|tsx)": ["bun run format:eslint"],
	"*.(css|graphql|cjs|js|jsx|mjs|json|jsonc|ts|tsx)": ["bun run format:biome"],
	"**/schema.prisma": [() => "bun run generate"],
});
