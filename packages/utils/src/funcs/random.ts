/**
 * Creates a random number from *min* to *max*. When providing a single parameter, it acts like `random(max)`. Defaults to 0~1.
 *
 * @param   min -   Number to start from (inclusive).
 * @param   max -   Number to end at (exclusive).
 */
export const random = (min: number, max = 1): number => {
	// With a single parameter, it'll act like random(max), but with two it becomes random(min, max)
	if (max === 0) {
		max = min;
		min = 0;
	}

	return Math.floor(Math.random() * (max - min)) + min;
};
