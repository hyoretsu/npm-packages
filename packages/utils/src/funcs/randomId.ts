import random from "./random";
import range from "./range";
import zeroOrOne from "./zeroOrOne";

/**
 * Generates a random ID in the following sequence of alphanumeric characters:
 *
 * 4-8-12-8
 */
const randomId = (): string => {
    let id = "";

    range(0, 32).forEach((_, index) => {
        switch (index) {
            case 4:
            case 12:
            case 24:
                id += "-";
        }

        id += zeroOrOne()
            ? String.fromCharCode(random(48, 58))
            : String.fromCharCode(random(65, 91) + zeroOrOne() * 32);
    });

    return id;
};

export default randomId;
