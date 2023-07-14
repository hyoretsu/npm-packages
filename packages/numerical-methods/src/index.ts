import { minMaxBisection } from "./custom";
import { bisection, falsePosition, newtonRaphson, secant } from "./functionZeros";
import { simpsonRule13, trapezoidalRule } from "./integration";
import { lagrangeInterpolation, newtonInterpolation, vandermondeInterpolation } from "./interpolation";
import {
	doolittleLuDecomposition,
	gaussJacobi,
	gaussSeidel,
	gaussianElimination,
	luComposition,
	spectralRadius,
} from "./linearSystems";

export const categorizedMethods = {
	custom: {
		minMaxBisection,
	},
	functionZeros: {
		bisection,
		falsePosition,
		newtonRaphson,
		secant,
	},
	integration: {
		simpsonRule13,
		trapezoidalRule,
	},
	interpolation: {
		lagrangeInterpolation,
		newtonInterpolation,
		vandermondeInterpolation,
	},
	linearSystems: {
		doolittleLuDecomposition,
		gaussJacobi,
		gaussSeidel,
		gaussianElimination,
		luComposition,
		spectralRadius,
	},
};

export const allMethods = {
	...categorizedMethods.custom,
	...categorizedMethods.functionZeros,
	...categorizedMethods.integration,
	...categorizedMethods.interpolation,
	...categorizedMethods.linearSystems,
};

export type AllMethods = keyof typeof allMethods;

export * from "./custom";
export * from "./functionZeros";
export * from "./integration";
export * from "./interpolation";
export * from "./linearSystems";
