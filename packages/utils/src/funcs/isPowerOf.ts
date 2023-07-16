/**
 * Checks if X is a power of Y.
 *
 * Credits: https://stackoverflow.com/a/4429063/8209582
 */
export const isPowerOf = (x: number, y: number): boolean => {
	while (x % y === 0) {
		x /= y;
	}

	return x === 1;
};
