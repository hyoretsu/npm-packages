export function createEnumFromArray<T extends string>(
	arr: readonly T[],
	uppercase: true,
): { [K in T as Uppercase<K>]: K };
export function createEnumFromArray<T extends string>(arr: readonly T[], uppercase?: false): { [K in T]: K };
export function createEnumFromArray<T extends string>(arr: readonly T[], uppercase = false) {
	return Object.fromEntries(arr.map(item => [uppercase ? item.toUpperCase() : item, item])) as any;
}
