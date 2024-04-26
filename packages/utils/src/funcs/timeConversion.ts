export type TimeUnit = "days" | "hours" | "minutes" | "seconds" | "milliseconds";

const timeUnits: TimeUnit[] = ["days", "hours", "minutes", "seconds", "milliseconds"];

/**
 * Converts one time unit to another.
 */
export function timeConversion(amount: number, from: TimeUnit, to: TimeUnit): number {
	if (amount < 0) {
		throw new Error("Time cannot be negative.");
	}

	let validFrom = false,
		validTo = false;

	for (const unit of timeUnits) {
		if (unit === from) validFrom = true;
		if (unit === to) validTo = true;
	}

	if (!validFrom || !validTo) {
		throw new Error("Please provide a valid time unit.");
	}

	if (from === to) {
		return amount;
	}

	let fromIndex = timeUnits.indexOf(from),
		toIndex = timeUnits.indexOf(to);

	if (from === "days") {
		amount *= 24;
		fromIndex += 1;
	}
	if (to === "milliseconds") {
		amount *= 1000;
		toIndex -= 1;
	}

	if (toIndex !== fromIndex) {
		amount *= 60 ** (toIndex - fromIndex);
	}

	return amount;
}
