export const validHex = (hex: string) => {
	if (
		!hex.startsWith("#") ||
		(hex.length !== 3 + 1 && hex.length !== 6 + 1 && hex.length !== 4 + 1 && hex.length !== 8 + 1) ||
		hex.search(/[^a-fA-F\d#]/) >= 0
	) {
		return false;
	}

	return true;
};
