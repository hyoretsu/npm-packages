import { readFileSync } from "fs";
import path from "path";

const isReactNative = () => {
    const packageJson = JSON.parse(readFileSync(`${path.resolve(".")}/package.json`, "utf8"));

    return Object.keys(packageJson.dependencies).includes("react-native");
};

const isReactJs = () => {
    return !isReactNative();
};

const reactJsOrNative = () => {
    return isReactNative() ? "react-native" : "reactjs";
};

export { isReactNative, isReactJs, reactJsOrNative };
