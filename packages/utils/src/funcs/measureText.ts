import { RefObject } from "react";

export type MeasureTextParam = RefObject<Element>;

/** Measures how many pixels of height a given text will need. (Currently only supports React refs)
 *
 * Credits: [Phuoc Nguyen](https://phuoc.ng/collection/html-dom/count-how-many-lines-a-given-string-takes-up-in-a-text-area)
 */
export const measureText = (text: string, param: MeasureTextParam): string => {
	let lineCount = 0,
		lineHeight = "";

	const parseValue = (value?: string | number): number | string => {
		if (!value) {
			return 0;
		}

		if (typeof value === "number") {
			return `${value}px`;
		}

		if (!value.endsWith("px") || !value.endsWith("rem") || !value.endsWith("em")) {
			return 0 as number;
		}

		if (value.endsWith("rem")) {
			return (
				parseInt(value.slice(0, -3), 10) *
				Number(getComputedStyle(document.documentElement).fontSize.slice(0, -2))
			);
		}

		return parseInt(value.slice(0, -2), 10);
	};

	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	let paddingLeft: number | string = 0,
		paddingRight: number | string = 0;

	if (param.current) {
		const element = param.current;

		const computedStyles = window.getComputedStyle(element);
		console.log(computedStyles);

		lineHeight = computedStyles.lineHeight;
		if (lineHeight === "normal") {
			lineHeight = "1.1rem";
		}

		const { fontFamily, fontSize, fontWeight } = computedStyles;
		context.font = `${fontWeight} ${fontSize} ${fontFamily}`;

		({ paddingLeft, paddingRight } = computedStyles);
		canvas.width =
			// @ts-ignore
			element.getBoundingClientRect().width - parseValue(paddingLeft) - parseValue(paddingRight);
	}

	let currentLine = "";
	const words = text.split(" ");
	for (const word of words) {
		const wordSpace = `${word} `;

		const wordWidth = context.measureText(wordSpace).width;
		const lineWidth = context.measureText(currentLine).width;

		if (lineWidth + wordWidth > canvas.width) {
			lineCount += 1;
			currentLine = wordSpace;
		} else {
			currentLine += wordSpace;
		}
	}

	if (currentLine.trim() !== "") {
		lineCount += 1;
	}

	return `calc(${lineCount} * ${lineHeight})`;
};
