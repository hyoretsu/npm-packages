import { useStyleInjection } from "@hyoretsu/react-hooks";
import { range } from "@hyoretsu/utils";
import React from "react";
import type { CSSProperties } from "react";

export interface TextRingProps {
	children?: string;
	/** Color of the dividing bullet that appears between words. */
	bulletColor?: string;
	/** Adds a • between words. Has no effect without the `words` prop. */
	dividingBullet?: boolean;
	/** Duration of the spin. Only works with the `rotating` prop. */
	duration?: number;
	firstHalfColor?: string;
	/** Amount of extra rotation to be appliead to the letters. */
	offset?: number;
	/** Amount of empty spaces to be added to the end of the string. */
	padding?: number;
	radius?: number;
	/** Direction of the spin. If this is true, the text will spin counterclockwise. Only works with the `rotating` prop. */
	reverse?: boolean;
	/** If this is true, the text will rotate along the radius. Can be customized with the `duration` and `reverse` props. */
	rotating?: boolean;
	secondHalfColor?: string;
	style?: CSSProperties;
	/** Meant to be used alongside the `dividingBullet` prop. Don't send children if you're using this. */
	words?: string[];
}

const bullet = "•";

/**
 * Credits: [Jhey Tompkins](https://dev.to/jh3y)
 */
export const TextRing: React.FC<TextRingProps> = ({
	children,
	bulletColor = "#000",
	dividingBullet,
	duration = 6,
	firstHalfColor = "#000",
	offset = 0,
	padding = 0,
	radius = 0,
	reverse = false,
	rotating = false,
	secondHalfColor = "#000",
	style,
	words,
}) => {
	let characters: string[] = [];

	if (dividingBullet) {
		if (!words) {
			throw new Error("The dividing bullet option must be used with the 'words' prop.");
		}

		if (padding) {
			console.warn("Using padding along with dividing bullet isn't advised.");
		}
	}
	if (words && children) {
		throw new Error("Using 'words' alongside 'children' isn't supported. Please use one or the other.");
	}

	if (children) {
		characters = children.split("");

		if (padding) {
			characters.push(...range(padding).map(_ => " "));
		}
	} else if (words) {
		for (const word of words) {
			characters.push(...word.split(""));

			if (dividingBullet) {
				characters.push(bullet);
			}
		}
	}

	const fullLength = characters.length - (words?.length || 0) - padding;

	if (!radius) {
		const innerAngle = 360 / fullLength;

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
			{characters.map((character, index) => {
				const isBullet = character === bullet;

				let color = firstHalfColor;

				if (isBullet) {
					color = bulletColor;
				} else if (index > fullLength / 2) {
					color = secondHalfColor;
				}

				return (
					<span
						key={index}
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: `translate(-50%, -50%) rotate(calc(360deg / ${characters.length} * ${
								index + offset
							})) translateY(calc(${isBullet ? radius * 1.5 + 0.2 : radius} * -1ch))`,
							color,
							...(isBullet && { fontFamily: "Times New Roman" }),
						}}
					>
						{character}
					</span>
				);
			})}
		</div>
	);
};
