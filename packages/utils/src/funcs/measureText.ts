import { RefObject } from "react";

type MeasureTextParam = RefObject<Element>;

/** Measures how many pixels of height a given text will need. (Currently only supports React refs) */
export const measureText = (text: string, param: MeasureTextParam) => {
	let element: Element;
	let lineCount = 0,
		lineHeight = "0px";

	const parseValue = (value: string) => {
		if (!value.endsWith("px")) {
			return 0;
		}

		return parseInt(value.slice(0, -2), 10);
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
