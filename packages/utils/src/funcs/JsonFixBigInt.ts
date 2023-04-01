/**
 * Fixes JSON serialization errors involving `BigInt`
 */
const JsonFixBigInt = (json: Record<string, any>) => {
    return JSON.parse(
        JSON.stringify(json, (key, value) => (typeof value === "bigint" ? Number(value) : value)),
    );
};

export default JsonFixBigInt;
