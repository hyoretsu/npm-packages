import React from "react";

export interface SvgGradientProps {
	colors: string[];
	id?: string;
	to?: "bottom" | "left" | "right" | "top";
}

export const SvgGradient: React.FC<SvgGradientProps> = ({ colors, id, to = "bottom" }) => {
	const xy = {
		x1: 0.5,
		x2: 0.5,
		y1: 0,
		y2: 1,
	};

	switch (to) {
		case "left":
			xy.x1 = 1;
			xy.x2 = 0;
			xy.y1 = 0.5;
			xy.y2 = 0.5;
			break;
		case "right":
			xy.x1 = 0;
			xy.x2 = 1;
			xy.y1 = 0.5;
			xy.y2 = 0.5;
			break;
		case "top":
			xy.y1 = 1;
			xy.y2 = 0;
			break;
	}

	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
		<svg width="0" height="0" style={{ position: "absolute" }}>
			<linearGradient id={id} {...xy}>
				{colors.map((color, index) => (
					<stop key={color} offset={`${(index / (colors.length - 1)) * 100}%`} stopColor={color} />
				))}
			</linearGradient>
		</svg>
	);
};
