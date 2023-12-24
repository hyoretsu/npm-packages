import { validHex } from "./validHex";

export const hexToHsl = (hex: string) => {
	if (!validHex(hex)) {
		throw new Error("Please provide a valid color hex string.");
	}

	hex = hex.slice(1);
	let colors = [];

	if (hex.length === 3 || hex.length === 4) {
		colors = hex.split("").map(char => `${char}${char}`);
	} else {
		colors = hex.match(/.{2}/g) as RegExpMatchArray;
	}

	const r = parseInt(colors[0], 16) / 255;
	const g = parseInt(colors[1], 16) / 255;
	const b = parseInt(colors[2], 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);

	let h = 0;
	let s = 0;
	let l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;

		if (l > 0.5) {
			s = d / (2 - max - min);
		} else {
			s = d / (max + min);
		}

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h /= 6;
	}

	h = Math.round(h * 360);
	s = Math.round(s * 100);
	l = Math.round(l * 100);

	return `hsl(${h}, ${s}%, ${l}%)`;
};
