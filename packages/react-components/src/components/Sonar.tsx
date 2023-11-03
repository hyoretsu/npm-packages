import { useStyleInjection } from "@hyoretsu/react-hooks";
import { hexToRgba } from "@hyoretsu/utils";
import React, { ReactElement, cloneElement } from "react";

export interface SonarProps {
	children: ReactElement;
	/** A color hex code. */
	color: string;
	/** Duration of the animation. Default is seconds. */
	duration?: number | string;
	/** Size of the animation. */
	size?: number | string;
}

export const Sonar: React.FC<SonarProps> = ({ children, color, duration = 1, size = "1rem" }) => {
	const rgbColor = hexToRgba(color);

	if (typeof size === "number") {
		size = `${size}px`;
	}

	const keyframe = `sonar-${color.slice(1)}`;

	useStyleInjection(`
        @keyframes ${keyframe} {
            0% {
                box-shadow: 0 0 0 0 rgba(${rgbColor}, 0.1);
            }
            50% {
                box-shadow: 0 0 0 calc(${size} / 3 * 2) rgba(${rgbColor}, 0.3);
            }
            100% {
                box-shadow: 0 0 0 ${size} rgba(${rgbColor}, 0);
            }
        }
    `);

	return cloneElement(children as ReactElement, {
		style: {
			animation: `${keyframe} ${typeof duration === "number" ? `${duration}s` : duration} linear infinite`,
			margin: size,
		},
	});
};
