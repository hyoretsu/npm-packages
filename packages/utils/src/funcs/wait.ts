/**
 * @param	time    -   Time to wait in ms.
 */
const wait = async (time: number): Promise<any> => {
    return new Promise((res) => {
        setTimeout(res, time);
    });
};

export default wait;
