/**
 * Formats a phone number to a specific country format.
 *
 * @param   phone               Number to format.
 * @param   country             ISO country code.
 * @param   includeCountryCode  Whether to include the country code in the output.
 */
export const formatPhoneNumber = (
	phoneNumber: string | number,
	country: "br" | "us",
	includeCountryCode = true,
) => {
	const countryCodes = {
		br: "55",
		us: "1",
	};
	const formats = {
		br: [2, 5, 4],
		us: [3, 3, 4],
	};

	if (typeof phoneNumber === "number") {
		phoneNumber = String(phoneNumber);
	}

	const cleaned = phoneNumber.replace(/\D/g, "");

	// /^(\d{3})(\d{3})(\d{4})$/
	const matches = cleaned.match(
		new RegExp(
			formats[country].reduce((regex, number) => {
				return `${regex}(\\d{${number}})`;
			}, ""),
		),
	);

	if (!matches) {
		throw new Error("Please enter a phone number.");
	}

	return `${includeCountryCode ? `+${countryCodes[country]} ` : ""}(${matches[1]}) ${matches[2]}-${
		matches[3]
	}`;
};
