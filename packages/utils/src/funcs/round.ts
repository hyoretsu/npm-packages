export const round = (number: number, precision = 0): number => {
	return Math.round((number + Number.EPSILON) * 10 ** precision) / 10 ** precision;
};
