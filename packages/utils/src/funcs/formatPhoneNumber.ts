type Country = "br" | "us";

/**
 * Formats a phone number to a specific country format.
 *
 * @param   phone               Number to format.
 * @param   country             ISO country code.
 * @param   includeCountryCode  Whether to include the country code in the output.
 */
export const formatPhoneNumber = (
	phoneNumber: string | number,
	country: Country,
	includeCountryCode = true,
) => {
	const countryCodes = {
		br: "55",
		us: "1",
	};
	const formats: Record<Country, Array<number | number[]>> = {
		br: [2, [4, 5], 4],
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
				return `${regex}(\\d{${Array.isArray(number) ? `${number[0]},${number[1]}` : number}})`;
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
