import React from "react";

import { hexToRgba } from "@hyoretsu/utils";

export interface GlowingBlurProps {
	color: string;
	/** In case you want to position it from the right/bottom. */
	invertPositions?: [x: boolean, y: boolean];
	/** A number between 0 and 1. */
	intensity?: number;
	/** A number between 0 and 1. */
	opacity?: number;
	/** In case you want `position: absolute`. Default is left/top */
	position?: [x: number | string, y: number | string];
	/** A number in pixels or a measurement with CSS units. */
	radius: number | string;
	zIndex?: number;
}

export const GlowingBlur: React.FC<GlowingBlurProps> = ({
	color,
	intensity = 1,
	invertPositions = [false, false],
	opacity = 1,
	position,
	radius,
	zIndex,
}) => {
	let unit: string;

	if (typeof radius === "string") {
		[radius, unit] = Array.from(String(radius).matchAll(/(\d+)(.*)/g))[0].slice(1) as [number, string];
	} else {
		unit = "px";
	}

	const positions: Record<string, number | string> = {};

	if (position) {
		if (invertPositions[0]) {
			positions.right = position[0];
		} else {
			positions.left = position[0];
		}

		if (invertPositions[1]) {
			positions.bottom = position[1];
		} else {
			positions.top = position[1];
		}
	}

	return (
		<span
			style={{
				backgroundImage: `radial-gradient(46% 46% at 50% 50%, rgba(${hexToRgba(color)}, ${
					intensity * 255
				}), transparent)`,
				borderRadius: "50%",
				height: `${radius * 2}${unit}`,
				opacity,
				width: `${radius * 2}${unit}`,
				zIndex,
				...(position && {
					position: "absolute",
					...positions,
				}),
			}}
		/>
	);
};
