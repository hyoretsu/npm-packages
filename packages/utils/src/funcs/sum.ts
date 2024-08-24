export const sum = (things: number[] | Record<any, number>) => {
	if (!Array.isArray(things)) {
		things = Object.values(things);
	}

	return things.reduce((sum, thing) => sum + thing, 0);
};
