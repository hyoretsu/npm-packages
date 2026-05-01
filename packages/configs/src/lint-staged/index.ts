/** @type {import('lint-staged').Configuration} */

type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

const lockCommands: Record<PackageManager, Array<() => string>> = {
	bun: [() => "bun i --lockfile-only"],
	npm: [() => "npm i --package-lock-only"],
	pnpm: [() => "pnpm i --lockfile-only"],
	yarn: [() => "yarn install"], // For Yarn Berry, use: "yarn install --mode update-lockfile"
};

export interface LintStagedConfigParams {
	packageManager?: PackageManager;
}

export const lintStagedConfig = ({ packageManager }: LintStagedConfigParams = {}) => ({
	...(packageManager && {
		"(bun.|package-|pnpm-|yarn.)lock*": lockCommands[packageManager],
	}),
	"*.(cjs|js|jsx|mjs|ts|tsx)": ["bunx eslint --quiet --fix"],
	"*.(css|graphql|cjs|js|jsx|mjs|json|jsonc|ts|tsx)": [
		() => "bunx biome check  --diagnostic-level=error --staged --write --unsafe",
	],
});
