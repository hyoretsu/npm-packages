/**
 * Fixes an error that happens sometimes when you're working with numbers.
 */
const fixNumber = (number: number): number => {
    return Number(number.toPrecision(12));
};

export default fixNumber;
