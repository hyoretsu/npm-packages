/** @type {import('lint-staged').Configuration} */
export default {
	"*.(css|graphql|js|jsx|json|jsonc|ts|tsx)": [
		"npm run biome check --diagnostic-level=error --write --unsafe --no-errors-on-unmatched",
	],
	"*.(js|jsx|ts|tsx)": ["npm run eslint --quiet --fix"],
};
