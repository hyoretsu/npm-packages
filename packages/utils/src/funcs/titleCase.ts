const titleCase = (str: string) => {
    return str.replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
};

export default titleCase;
