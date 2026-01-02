/** @type {import('lint-staged').Configuration} */

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

const lockCommands: Record<PackageManager, string> = {
	bun: "bun install --lockfile-only",
	npm: "npm install --package-lock-only",
	pnpm: "pnpm install --lockfile-only",
	yarn: "yarn install", // For Yarn Berry, use: "yarn install --mode update-lockfile"
};

export const lintStagedConfig = (packageManager?: PackageManager) => ({
	...(packageManager && {
		"(bun.|package-|pnpm-|yarn.)lock*": [() => lockCommands[packageManager]],
	}),
	"*.(css|graphql|js|jsx|json|jsonc|ts|tsx)": [
		"npx biome check --diagnostic-level=error --write --unsafe --no-errors-on-unmatched",
	],
	"*.(js|jsx|ts|tsx)": ["npx eslint --quiet --fix"],
});
