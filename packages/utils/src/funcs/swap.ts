/**
 * Swaps two elements in an array.
 *
 * @param   array           -   The array to swap.
 * @param   firstIndex      -   The index of the first element.
 * @param   secondIndex     -   The index of the second element.
 */
const swap = (array: any[], firstIndex: number, secondIndex: number) => {
    const temp = array[firstIndex];
    array[firstIndex] = array[secondIndex];
    array[secondIndex] = temp;
};

export default swap;
