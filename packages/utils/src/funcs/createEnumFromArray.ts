export const createEnumFromArray = <T extends string, Enum = { [key in T]: key }>(
	arr: readonly T[],
): Enum => {
	return Object.fromEntries(arr.map(item => [item, item])) as Enum;
};
