import { minMaxBisection, minMaxBisectionParams } from "./custom";
import {
	bisection,
	falsePosition,
	newtonRaphson,
	newtonRaphsonParams,
	secant,
	zerosFunctionParams,
} from "./functionZeros";
import { integrationParams, simpsonRule13, trapezoidalRule } from "./integration";
import {
	interpolationParams,
	lagrangeInterpolation,
	newtonInterpolation,
	vandermondeInterpolation,
} from "./interpolation";
import {
	doolittleLuDecomposition,
	doolittleLuDecompositionParams,
	gaussJacobi,
	gaussMethodParams,
	gaussSeidel,
	gaussianElimination,
	gaussianEliminationParams,
	luComposition,
	luCompositionParams,
	spectralRadius,
	spectralRadiusParams,
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
export type CustomMethods = keyof typeof categorizedMethods.custom;
export type FunctionZerosMethods = keyof typeof categorizedMethods.functionZeros;
export type IntegrationMethods = keyof typeof categorizedMethods.integration;
export type InterpolationMethods = keyof typeof categorizedMethods.interpolation;
export type LinearSystemsMethods = keyof typeof categorizedMethods.linearSystems;

export const customMethodKeys = ["minMaxBisection"];
export const functionZerosKeys = ["bisection", "falsePosition", "newtonRaphson", "secant"];
export const integrationKeys = ["simpsonRule13", "trapezoidalRule"];
export const interpolationKeys = ["lagrangeInterpolation", "newtonInterpolation", "vandermondeInterpolation"];
export const linearSystemsKeys = [
	"doolittleLuDecomposition",
	"gaussJacobi",
	"gaussSeidel",
	"gaussianElimination",
	"luComposition",
	"spectralRadius",
];
export const methodKeys = [
	...customMethodKeys,
	...functionZerosKeys,
	...integrationKeys,
	...interpolationKeys,
	...linearSystemsKeys,
];

export const paramsList = {
	bisection: zerosFunctionParams,
	doolittleLuDecomposition: doolittleLuDecompositionParams,
	falsePosition: zerosFunctionParams,
	gaussianElimination: gaussianEliminationParams,
	gaussJacobi: gaussMethodParams,
	gaussSeidel: gaussMethodParams,
	lagrangeInterpolation: interpolationParams,
	luComposition: luCompositionParams,
	minMaxBisection: minMaxBisectionParams,
	newtonInterpolation: interpolationParams,
	newtonRaphson: newtonRaphsonParams,
	secant: zerosFunctionParams,
	simpsonRule13: integrationParams,
	spectralRadius: spectralRadiusParams,
	trapezoidalRule: integrationParams,
	vandermondeInterpolation: interpolationParams,
};

export * from "./custom";
export * from "./functionZeros";
export * from "./integration";
export * from "./interpolation";
export * from "./linearSystems";
