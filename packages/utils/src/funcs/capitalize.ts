export const capitalize = (str: string) => {
    const words = str.split(" ");

    const capitalizedWords = words.map((word) => word[0].toUpperCase() + word.slice(1));

    return capitalizedWords.join(" ");
};
