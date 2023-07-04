import { degreesToRadians } from "./degreesToRadians";
import { haversine } from "./haversine";

export type Coordinate = [number, number];

/**
 * Calculates the absolute distance between two coordinates. Result's in the unit of the radius you provide (defaults to Earth's radius in meters).
 *
 * @param coord1    -   `[latitude, longitude]`.
 * @param coord2    -   `[latitude, longitude]`.
 * @param radius    -   Radius of the planet or sphere for which you want to calculate the distance.
 */
export const distanceBetweenCoordinates = (
	coord1: Coordinate,
	coord2: Coordinate,
	radius = 6378.137 * 1000,
) => {
	const [latitude1, longitude1] = coord1.map((value) => degreesToRadians(value));
	const [latitude2, longitude2] = coord2.map((value) => degreesToRadians(value));

	const h =
		haversine(latitude2 - latitude1) +
		Math.cos(latitude1) * Math.cos(latitude2) * haversine(longitude2 - longitude1);

	const distance = Math.abs(2 * radius * Math.asin(Math.sqrt(h)));

	return distance;
};
