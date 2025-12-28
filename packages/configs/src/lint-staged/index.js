/** @type {import('lint-staged').Configuration} */
export default {
	"*.(css|graphql|js|jsx|json|jsonc|ts|tsx)": ["bun format:biome --no-errors-on-unmatched"],
	"*.(js|jsx|ts|tsx)": ["bun format:eslint"],
};
