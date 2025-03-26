import { isOdd, range } from "@hyoretsu/utils";
import { derivative, evaluate } from "mathjs";

import { minMaxBisection } from "./custom";

export type Integration = (data: Integration.Params) => Integration.Return;
export namespace Integration {
	export interface Params {
		func: string;
		pointN: number;
		x: [number, number];
	}

	export type Result = number;
	export interface Details {
		error: number;
	}
	export interface Return {
		result: Integration.Result;
		details: Integration.Details;
	}
}

export const integrationParams = {
	func: "string",
	pointN: "number",
	x: "[number,number]",
};

export const trapezoidalRule: Integration = ({ func, pointN, x }) => {
	const intervals = pointN - 1;

	const amplitude = (x[1] - x[0]) / intervals;
	const points = [...range(x[0], x[1], amplitude), x[1]];
	const y = points.map(number => evaluate(func, { x: number }));

	let result = y.reduce((sum, value, i) => {
		if (i === 0 || i === y.length - 1) {
			return sum + value;
		}

		return sum + 2 * value;
	}, 0);
	result *= amplitude / 2;

	const secondDerivative = derivative(derivative(func, "x"), "x").toString();

	const {
		result: {
			interval: [maxPoint],
		},
	} = minMaxBisection({
		func: secondDerivative,
		interval: [x[0], x[1]],
		target: "max",
		precision: 1e-12,
		options: {
			maxIterations: 1000,
		},
	});

	const error =
		(amplitude ** 3 / (12 * intervals ** 2)) * Math.abs(evaluate(secondDerivative, { x: maxPoint }));

	return { result, details: { error } };
};

export const simpsonRule13: Integration = ({ func, pointN, x }) => {
	const intervals = pointN - 1;

	const amplitude = (x[1] - x[0]) / intervals;
	const points = [...range(x[0], x[1], amplitude), x[1]];
	const y = points.map(number => evaluate(func, { x: number }));

	let result = y.reduce((sum, value, i) => {
		if (i === 0 || i === y.length - 1) {
			return sum + value;
		}

		return sum + value * (isOdd(i) ? 4 : 2);
	}, 0);
	result *= amplitude / 3;

	const fourthDerivative = derivative(
		derivative(derivative(derivative(func, "x"), "x"), "x"),
		"x",
	).toString();

	const {
		result: {
			interval: [maxPoint],
		},
	} = minMaxBisection({
		func: fourthDerivative,
		interval: x,
		target: "max",
		precision: 1e-12,
		options: {
			maxIterations: 1000,
		},
	});

	const error =
		(amplitude ** 5 / (180 * intervals ** 2)) * Math.abs(evaluate(fourthDerivative, { x: maxPoint }));

	return { result, details: { error } };
};
