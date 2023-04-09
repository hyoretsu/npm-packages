/**
 * Fixes JSON serialization errors involving `BigInt`
 */
export const JsonFixBigInt = (json: Record<string, any>) => {
	return JSON.parse(
		JSON.stringify(json, (key, value) => (typeof value === "bigint" ? Number(value) : value)),
	);
};
