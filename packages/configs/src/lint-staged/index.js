/** @type {import('lint-staged').Configuration} */
export default {
	"*.(css|graphql|js|jsx|json|jsonc|ts|tsx)": [
		"npx biome check --diagnostic-level=error --write --unsafe --no-errors-on-unmatched",
	],
	"*.(js|jsx|ts|tsx)": ["npx eslint --quiet --fix"],
};
