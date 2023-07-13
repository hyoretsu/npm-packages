import * as custom from "./custom";
import * as functionZeros from "./functionZeros";
import * as integration from "./integration";
import * as interpolation from "./interpolation";
import * as linearSystems from "./linearSystems";

export const categorizedMethods = {
	custom,
	functionZeros,
	integration,
	interpolation,
	linearSystems,
};

export const allMethods = Object.values(categorizedMethods).reduce(
	(obj, methods) => ({
		...obj,
		...methods,
	}),
	{},
);

export * from "./custom";
export * from "./functionZeros";
export * from "./integration";
export * from "./interpolation";
export * from "./linearSystems";
