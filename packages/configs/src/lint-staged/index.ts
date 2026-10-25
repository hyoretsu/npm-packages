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

// lint-staged parses command strings directly; it does not invoke a shell.
const quote = (filename: string) => {
	if (filename.includes('"') && filename.includes("'"))
		throw new Error("lint-staged cannot parse filenames containing both quote styles");
	return filename.includes('"') ? `'${filename}'` : `"${filename}"`;
};

export const lintStagedConfig = ({ packageManager }: LintStagedConfigParams = {}) => ({
	...(packageManager && {
		"(bun.|package-|pnpm-|yarn.)lock*": lockCommands[packageManager],
	}),
	"*": (filenames: string[]) => {
		if (filenames.length === 0) return [];
		const paths = filenames.map(quote).join(" ");
		const commands = [
			`bunx biome check --formatter-enabled=false --diagnostic-level=error --files-ignore-unknown=true --no-errors-on-unmatched --write --unsafe ${paths}`,
		];
		const scripts = filenames.filter(filename => /\.(cjs|js|jsx|mjs|ts|tsx)$/.test(filename));
		if (scripts.length > 0) commands.push(`bunx eslint --quiet --fix ${scripts.map(quote).join(" ")}`);
		// Keep lint fixes and formatting sequential for each staged batch.
		commands.push(`bun fmt --ignore-unknown --no-error-on-unmatched-pattern ${paths}`);
		return commands;
	},
});
