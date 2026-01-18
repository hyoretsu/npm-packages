import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
// @ts-expect-error: no types definition
import biome from "eslint-config-biome";
import tseslint from "typescript-eslint";

export default defineConfig([
	{ ignores: ["**/.next/**", "**/build/**", "**/dist/**", "**/node_modules/**"] },
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
