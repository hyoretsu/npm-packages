export const filterObject = <T extends Record<string, any>>(
	object: T,
	keys: (keyof T)[] = Object.keys(object),
): Partial<T> => {
	const filteredObject: Partial<T> = {};

	for (const key of keys) {
		if (object[key] !== undefined) {
			filteredObject[key] = object[key];
		}
	}

	return filteredObject;
};
