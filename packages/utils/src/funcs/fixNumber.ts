/**
 * Fixes an error that happens sometimes when you're working with numbers.
 */
export const fixNumber = (number: number): number => {
    return Number(number.toPrecision(12));
};
