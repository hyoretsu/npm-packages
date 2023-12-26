import React, { CSSProperties } from "react";

import { hexToRgba } from "@hyoretsu/utils";

export interface GlowingBlurProps {
	className?: string;
	color: string;
	id?: string;
	/** In case you want to position it from the right/bottom. */
	invertPositions?: [x: boolean, y: boolean];
	/** A number between 0 and 1. */
	intensity?: number;
	key?: string;
	/** A number between 0 and 1. */
	opacity?: number;
	/** In case you want `position: absolute`. Default is left/top. */
	position?: [x: number | string, y: number | string];
	/** In case you want `position: fixed` instead of absolute. */
	positionFixed?: boolean;
	/** A number in pixels or a measurement with CSS units. */
	radius: number | string;
	style?: CSSProperties;
	zIndex?: number;
}

export const GlowingBlur: React.FC<GlowingBlurProps> = ({
	className,
	color,
	id,
	intensity = 1,
	invertPositions = [false, false],
	key,
	opacity = 1,
	position,
	positionFixed,
	radius,
	style,
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
			id={id}
			key={key}
			className={className}
			style={{
				backgroundImage: `radial-gradient(46% 46% at 50% 50%, rgba(${hexToRgba(
					color,
				)}, ${intensity}), transparent)`,
				borderRadius: "50%",
				height: `${radius * 2}${unit}`,
				opacity,
				width: `${radius * 2}${unit}`,
				zIndex,
				...(position && {
					position: positionFixed ? "fixed" : "absolute",
					...positions,
				}),
				...style,
			}}
		/>
	);
};
