import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
// @ts-expect-error: no types definition
import biome from "eslint-config-biome";
import pluginJest from "eslint-plugin-jest";
import tseslint from "typescript-eslint";

export default defineConfig([
	{ ignores: ["**/build/**", "**/dist/**", "**/node_modules/**"] },
	eslint.configs.recommended,
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
		},
	},
	// JS files
	{
		extends: [tseslint.configs.disableTypeChecked],
		files: ["**/*.js", "**/*.jsx"],
	},
	// Test files
	{
		extends: [pluginJest.configs["flat/all"]],
		files: [
			"**/*.spec.js",
			"**/*.spec.ts",
			"**/*.test.js",
			"**/*.test.ts",
			"**/*.spec.jsx",
			"**/*.spec.tsx",
			"**/*.test.jsx",
			"**/*.test.tsx",
		],
		languageOptions: {
			globals: pluginJest.environments.globals.globals,
			// parserOptions: {
			//   projectService: true,
			//   tsconfigRootDir: import.meta.dirname,
			// },
		},
		plugins: {
			jest: pluginJest,
		},
		rules: {
			"jest/no-commented-out-tests": "off",
			"jest/no-deprecated-functions": "off",
			//? Not sure if these should be turned off, but it was flagging most if not all existing tests and they will eventually be replaced by Bun anyway
			"jest/require-hook": "off",
			"jest/unbound-method": "off",
		},
		settings: {
			jest: {
				globalPackage: "bun:test",
			},
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
			"@typescript-eslint/no-unused-vars": "off",
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
