/** @type {import('lint-staged').Configuration} */
export default {
	"*.(json|js|jsx|ts|tsx)": ["biome check --write"],
};
