/**
 * Applies the haversine function to a degree.
 *
 * @param degree    -   Degree in radians.
 */
export const haversine = (degree: number) => (1 - Math.cos(degree)) / 2;

/**
 * Applies the archaversine function to a degree.
 *
 * @param degree    -   Degree in radians.
 */
export const archaversine = (degree: number) => Math.acos(1 - 2 * degree);
