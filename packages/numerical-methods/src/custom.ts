import { fixNumber } from "@hyoretsu/utils";
import { evaluate } from "mathjs";

import type { FunctionZeros } from "./functionZeros";

export namespace Custom {
	export type MinMaxBisection = (info: MinMaxBisection.Params) => MinMaxBisection.Return;
	export namespace MinMaxBisection {
		export interface Params {
			func: string;
			interval: [number, number];
			target: "min" | "max";
			precision: number;
			options?: Omit<FunctionZeros.Options, "bail">;
		}

		export type Details = Array<
			Omit<FunctionZeros.Details, "condition2"> & {
				interval: number[];
				results: number[];
			}
		>;
		export interface Result {
			iterations: number;
			interval: [string, string];
		}
		export interface Return {
			result: Result;
			details: Details;
		}
	}
}

const minMaxBisectionOptionsParams = {
	conditionsWhitelist: "[boolean,boolean]",
	maxIterations: "number",
	origFunc: "string",
	relativeError: "number",
};

export const minMaxBisectionParams = {
	func: "string",
	interval: "[number,number]",
	target: '"min"|"max"',
	precision: "number",
	options: minMaxBisectionOptionsParams,
};

export const minMaxBisection: Custom.MinMaxBisection = ({
	func,
	interval: [a, b],
	target,
	precision,
	options: {
		conditionsWhitelist = [true, true],
		maxIterations = Number.POSITIVE_INFINITY,
		origFunc,
		relativeError,
	} = {},
}) => {
	if (precision === 0) {
		precision = 1e-5;
	}

	const details = [];
	let iterations = -1;
	const nextResults = { a: [0, 0], b: [0, 0] };
	let trueX = typeof relativeError === "number" && relativeError;

	while (true) {
		const results = [evaluate(func, { x: a }), evaluate(func, { x: b })];

		const midPoint = (a + b) / 2;
		const midResult = evaluate(func, { x: midPoint });

		iterations += 1;
		const condition1 = Math.abs(b - a);

		const swapPoints = (point: string) => {
			if (relativeError) {
				if (!trueX) {
					if (point === "a") {
						trueX = a;
					} else {
						trueX = b;
					}
				}

				relativeError = Math.abs(midPoint - trueX) / Math.abs(midPoint);
			}

			if (point === "a") {
				a = midPoint;
			} else {
				b = midPoint;
			}
		};

		const targetSign = target === "max" ? 1 : -1;
		if (Math.sign(midResult - results[0]) === targetSign) {
			// If mid-point is higher/lower than A

			nextResults.a = [a, evaluate(func, { x: (midPoint + b) / 2 })];

			// and the next mid-point is higher/lower than it, swap for A
			if (Math.sign(nextResults.a[1] - midResult) === targetSign) {
				swapPoints("a");
			}
		} else if (Math.sign(midResult - results[1]) === targetSign) {
			// If mid-point is higher/lower than B

			nextResults.b = [b, evaluate(func, { x: (midPoint + a) / 2 })];

			// and the next mid-point is higher/lower than it, swap for B
			if (Math.sign(nextResults.b[1] - midResult) === targetSign) {
				swapPoints("b");
			}
		} else if (Math.sign(results[0] - results[1]) === targetSign) {
			// If A is lower/higher than B, swap for A
			swapPoints("b");
		} else if (Math.sign(results[1] - results[0]) === targetSign) {
			// If B is lower/higher than A, swap for B
			swapPoints("a");
		}

		details.push({
			iteration: iterations,
			interval: [fixNumber(a), fixNumber(b)],
			results: results.map(number => fixNumber(number)),
			x: fixNumber(midPoint),
			...(origFunc && { y: evaluate(origFunc, { x: midPoint }) }),
			...(relativeError && { relativeError: fixNumber(relativeError as number) }),
			condition1: fixNumber(condition1),
		});

		// Check if conditions are either disabled or true
		const condition1Pass = !conditionsWhitelist[0] || condition1 < precision;

		if (condition1Pass || iterations >= maxIterations) break;
	}

	const minIterations = Math.ceil((Math.log10(b - a) - Math.log10(precision)) / Math.log10(2));
	if (iterations < minIterations && maxIterations === Number.POSITIVE_INFINITY) {
		throw new Error(`Something went wrong, less iterations than the minimum (${minIterations}) were done.`);
	}

	return {
		result: {
			iterations,
			interval: [a.toPrecision(21), b.toPrecision(21)],
		},
		details,
	};
};
