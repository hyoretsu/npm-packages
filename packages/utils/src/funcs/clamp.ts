/**
 * Clamps a given value between a min and max values. Works just like CSS's `clamp()`.
 */
export function clamp(min: number, value: number, max: number): number {
	if (min > max) {
		throw new Error("Min value is greater than max value.");
	}
	if (max < min) {
		throw new Error("Max value is lesser than min value.");
	}

	if (value > max) {
		return max;
	}
	if (value < min) {
		return min;
	}

	return value;
}
