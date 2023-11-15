import { RefObject } from "react";

type MeasureTextParam = RefObject<Element>;

/** Measures how many height/width pixels a given text will have. */
export const measureText = (text: string, param: MeasureTextParam) => {
	let element: Element;
	let lineCount = 0,
		lineHeight = "0px";

	const parseValue = (value: string) => {
		return parseInt(value.slice(0, -2));
	};

	if (param.current) {
		element = param.current;
		({ lineHeight } = window.getComputedStyle(element));

		const { fontFamily, fontSize, fontWeight, paddingLeft, paddingRight } = window.getComputedStyle(element);

		const canvas = document.createElement("canvas");
		canvas.width =
			element!.getBoundingClientRect().width - parseValue(paddingLeft) - parseValue(paddingRight);

		const context = canvas.getContext("2d") as CanvasRenderingContext2D;
		context.font = `${fontWeight} ${fontSize} ${fontFamily}`;

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
	}

	return lineCount * parseValue(lineHeight);
};
