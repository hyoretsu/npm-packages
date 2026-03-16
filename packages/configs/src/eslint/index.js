// @ts-nocheck
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
// @ts-expect-error: no types definition
import biome from "eslint-config-biome";
import tseslint from "typescript-eslint";

export const generateIgnores = (filePath = ".gitignore") => {
	const resolvedPath = path.resolve(filePath);
	const rootDir = path.dirname(resolvedPath);
	const gitignoreFileName = path.basename(resolvedPath);

	if (!existsSync(resolvedPath)) {
		return {
			ignores: [],
		};
	}

	const readIgnoreFiles = dir =>
		readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
			const entryPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				if (entry.name === ".git" || entry.name === "node_modules") {
					return [];
				}

				return readIgnoreFiles(entryPath);
			}

			return entry.isFile() && entry.name === gitignoreFileName ? [entryPath] : [];
		});

	return {
		ignores: readIgnoreFiles(rootDir).flatMap(ignoreFilePath => {
			const relativeDir = path.relative(rootDir, path.dirname(ignoreFilePath)).split(path.sep).join("/");

			return readFileSync(ignoreFilePath, "utf-8")
				.split("\n")
				.map(line => line.replace(/\r$/, ""))
				.filter(line => line !== "" && line[0] !== "#" && line[0] !== "!")
				.map(line => {
					const normalizedLine = line[0] === "/" ? line.slice(1) : line;

					if (relativeDir === "") {
						return `**/${normalizedLine}`;
					}

					return `**/${relativeDir}/${normalizedLine}`;
				});
		}),
	};
};

export default defineConfig([
	{ ignores: ["**/.next/**", "**/build/**", "**/dist/**", "**/node_modules/**"] },
	eslint.configs.recommended,
	{
		rules: {
			"no-useless-assignment": "off",
		},
	},
	// TS files
	{
		extends: [tseslint.configs.strict, tseslint.configs.stylistic],
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tseslint.parser,
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-duplicate-enum-values": "off",
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-namespace": "off",
		},
	},
	// JS files
	{
		extends: [tseslint.configs.disableTypeChecked],
		files: ["**/*.js", "**/*.jsx"],
		rules: {
			"no-undef": "off",
		},
	},
	{
		extends: [biome],
		rules: {
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/consistent-indexed-object-style": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/no-dynamic-delete": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-namespace": "off",
			"@typescript-eslint/no-non-null-asserted-optional-chain": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/prefer-for-of": "off",
			"@typescript-eslint/require-await": "off",
			"jest/max-nested-describe": "off",
			"jest/no-disabled-tests": "off",
			"jest/no-done-callback": "off",
			"jest/no-duplicate-hooks": "off",
			"jest/no-export": "off",
			"jest/no-focused-tests": "off",
			"jest/no-standalone-expect": "off",
			"sort-imports": "off",
		},
	},
]);
