/**
 * Clamps a given value between a min and max values. Works just like CSS's `clamp()`.
 */
export function clamp(min: number, value: number, max: number): number {
	if (value > max) {
		return max;
	}
	if (value < min) {
		return min;
	}

	return value;
}
