import { validHex } from "./validHex";

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];
export type ColorArray = RGB | RGBA;

export const hexToRgba = (hex: string): ColorArray => {
	if (!validHex(hex)) {
		throw new Error("Please provide a valid color hex string.");
	}

	hex = hex.slice(1);

	function hexToResult(colorCode: string, isAlpha = false) {
		return parseInt(colorCode, 16) / (isAlpha ? 255 : 1);
	}

	if (hex.length === 3 || hex.length === 4) {
		return hex
			.split("")
			.map((colorCode, index) => hexToResult(colorCode + colorCode, index === 3)) as ColorArray;
	}

	return hex.match(/.{2}/g)?.map((colorCode, index) => hexToResult(colorCode, index === 3)) as ColorArray;
};
