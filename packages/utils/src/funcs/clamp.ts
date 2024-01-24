/**
 * Clamps a given value between a min and max values. Works just like CSS's `clamp()`.
 */
export function clamp(min: number, value: number, max: number): number {
	if (min > value) {
		throw new Error("Min value is greater than preferred value.");
	}
	if (max < value) {
		throw new Error("Max value is less than preferred value.");
	}

	if (value > max) {
		return max;
	}
	if (value < min) {
		return min;
	}

	return value;
}
