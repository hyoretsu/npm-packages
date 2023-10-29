import { useStyleInjection } from "@hyoretsu/react-hooks";
import { range } from "@hyoretsu/utils";
import React, { CSSProperties } from "react";

export interface TextRingProps {
	children: string;
	firstHalfColor?: string;
	padding?: number;
	radius?: number;
	reverse?: boolean;
	rotating?: boolean;
	secondHalfColor?: string;
	duration?: number;
	style?: CSSProperties;
}

/**
 * Credits: [Jhey Tompkins](https://dev.to/jh3y)
 */
export const TextRing: React.FC<TextRingProps> = ({
	children,
	duration = 6,
	firstHalfColor = "#000",
	padding = 0,
	radius,
	reverse = false,
	rotating = false,
	secondHalfColor = "#000",
	style,
}) => {
	if (padding) {
		children = `${children}${range(padding).reduce(str => `${str} `, "")}`;
	}

	const characters = children.split("");
	const innerAngle = 360 / characters.length;

	if (!radius) {
		radius = 1 / Math.sin(innerAngle / (180 / Math.PI));
	}

	useStyleInjection(`
		@keyframes reverse-spin {
			to {
				rotate: -360deg;
			}
		}
	`);

	useStyleInjection(`
		@keyframes spin {
			to {
				rotate: 360deg;
			}
		}
	`);

	return (
		<div
			style={{
				display: "inline-block",
				position: "absolute",
				left: "50%",
				top: "50%",
				...(rotating && {
					animation: `${reverse ? "reverse-spin" : "spin"} ${duration}s infinite linear`,
				}),
				...style,
			}}
		>
			{characters.map((character, index) => (
				<span
					key={index}
					style={{
						// fontFamily: "monospace",
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: `translate(-50%, -50%) rotate(calc(360deg / ${characters.length} * ${index})) translateY(calc(${radius} * -1ch))`,
						color: index > (characters.length - padding) / 2 ? secondHalfColor : firstHalfColor,
					}}
				>
					{character}
				</span>
			))}
		</div>
	);
};
