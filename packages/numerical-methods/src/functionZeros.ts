import { fixNumber } from "@hyoretsu/utils";
import { derivative, evaluate } from "mathjs";

export namespace FunctionZeros {
	export interface Options {
		/** Stop iterating as soon as any of the conditions are true. */
		bail?: boolean;
		/** Which conditions you want to consider when iterating. */
		conditionsWhitelist?: [boolean, boolean];
		/** Maximum number of iterations. */
		maxIterations?: number;
		/** For instances where you're iterating over a different function, but still want the results from the original one e.g. iterating over a differentiated function to find a maximum value from the original. */
		origFunc?: string;
		/** Outputs the relative error between the new X and the last X or the true X, if given. */
		relativeError?: number | boolean;
	}

	export interface Params {
		func: string;
		interval: [number, number];
		precision: number;
		options?: Options;
	}

	export interface Result {
		interval: [string, string];
		iterations: number;
	}
	export interface Details {
		iteration: number;
		x: number;
		y?: number;
		relativeError?: number;
		condition1: number;
		condition2: number;
		interval: number[];
		results: number[];
	}
	export interface Return {
		result: Result;
		details: Details[];
	}

	export type NewtonRaphson = (info: NewtonRaphson.Params) => NewtonRaphson.Return;
	export namespace NewtonRaphson {
		export type Params = Omit<FunctionZeros.Params, "interval"> & {
			initialX: number;
		};

		export interface Return {
			result: Omit<FunctionZeros.Result, "interval"> & {
				x: string;
			};
			details: Array<
				Omit<FunctionZeros.Details, "interval" | "results"> & {
					prevX: number;
					prevY: number;
					diffY: number;
				}
			>;
		}
	}

	export type Secant = (info: Secant.Params) => Secant.Return;
	export namespace Secant {
		export type Params = FunctionZeros.Params;
		export type Return = FunctionZeros.Return;
	}

	export type Simple = (info: Simple.Params) => Simple.Return;
	export namespace Simple {
		export type Params = FunctionZeros.Params;
		export type Return = FunctionZeros.Return;
	}
}

const functionZerosOptionsParams = {
	bail: "boolean",
	conditionsWhitelist: "[boolean,boolean]",
	maxIterations: "number",
	origFunc: "string",
	relativeError: "boolean",
};

export const zerosFunctionParams = {
	func: "string",
	interval: "[number,number]",
	precision: "number",
	options: functionZerosOptionsParams,
};

export const bisection: FunctionZeros.Simple = ({
	func,
	interval: [a, b],
	precision,
	options: {
		bail = false,
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
	let trueX = typeof relativeError === "number" && relativeError;

	while (true) {
		const interval = [a, b];
		const results = [evaluate(func, { x: a }), evaluate(func, { x: b })];

		const midPoint = (a + b) / 2;
		const midResult = evaluate(func, { x: midPoint });

		iterations += 1;
		const condition1 = Math.abs(b - a);
		const condition2 = Math.abs(midResult);

		if (Math.sign(midResult) === Math.sign(results[0])) {
			if (relativeError && !trueX) trueX = a;

			a = midPoint;
		} else {
			if (relativeError && !trueX) trueX = b;

			b = midPoint;
		}

		details.push({
			iteration: iterations,
			interval: interval.map(number => fixNumber(number)),
			results: results.map(number => fixNumber(number)),
			x: fixNumber(midPoint),
			...(origFunc && { y: evaluate(origFunc, { x: midPoint }) }),
			...(relativeError &&
				trueX !== 0 && {
					relativeError: fixNumber(Math.abs(midPoint - (trueX as number)) / Math.abs(midPoint)),
				}),
			condition1: fixNumber(condition1),
			condition2: fixNumber(condition2),
		});

		// Check if conditions are either disabled or true
		const condition1Pass = !conditionsWhitelist[0] || condition1 < precision;
		const condition2Pass = !conditionsWhitelist[1] || condition2 < precision;

		if (
			(!bail && condition1Pass && condition2Pass) ||
			(bail && (condition1Pass || condition2Pass)) ||
			iterations >= maxIterations
		)
			break;
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

export const falsePosition: FunctionZeros.Simple = ({
	func,
	interval: [a, b],
	precision,
	options: {
		bail = false,
		conditionsWhitelist = [true, true],
		maxIterations = Number.POSITIVE_INFINITY,
		origFunc,
		relativeError = false,
	} = {},
}) => {
	if (precision === 0) {
		precision = 1e-5;
	}

	const details = [];
	let iterations = -1;
	let trueX = typeof relativeError === "number" && relativeError;

	while (true) {
		const interval = [a, b];
		const results = [evaluate(func, { x: a }), evaluate(func, { x: b })];

		const newPoint = (a * results[1] - b * results[0]) / (results[1] - results[0]);
		const newResult = evaluate(func, { x: newPoint });

		iterations += 1;
		const condition1 = Math.abs(b - a);
		const condition2 = Math.abs(evaluate(func, { x: newPoint }));

		switch (Math.sign(newResult)) {
			case Math.sign(results[0]):
				if (relativeError) {
					if (!trueX) trueX = a;

					relativeError = Math.abs(newPoint - trueX) / Math.abs(newPoint);
				}

				a = newPoint;
				break;
			case Math.sign(results[1]):
				if (relativeError) {
					if (!trueX) trueX = b;

					relativeError = Math.abs(newPoint - trueX) / Math.abs(newPoint);
				}

				b = newPoint;
				break;
		}

		details.push({
			iteration: iterations,
			interval: interval.map(number => fixNumber(number)),
			results: results.map(number => fixNumber(number)),
			x: fixNumber(newPoint),
			...(origFunc && { y: evaluate(origFunc, { x: newPoint }) }),
			...(relativeError && { relativeError: fixNumber(relativeError as number) }),
			condition1: fixNumber(condition1),
			condition2: fixNumber(condition2),
		});

		// Check if conditions are either disabled or true
		const condition1Pass = !conditionsWhitelist[0] || condition1 < precision;
		const condition2Pass = !conditionsWhitelist[1] || condition2 < precision;

		if (
			(!bail && condition1Pass && condition2Pass) ||
			(bail && (condition1Pass || condition2Pass)) ||
			iterations >= maxIterations
		)
			break;
	}

	return {
		result: {
			iterations,
			interval: [a.toPrecision(21), b.toPrecision(21)],
		},
		details,
	};
};

export const newtonRaphsonParams = {
	func: "string",
	initialX: "number",
	precision: "number",
	options: functionZerosOptionsParams,
};

export const newtonRaphson: FunctionZeros.NewtonRaphson = ({
	func,
	initialX: x,
	precision,
	options: {
		bail = false,
		conditionsWhitelist = [true, true],
		maxIterations = Number.POSITIVE_INFINITY,
		origFunc,
		relativeError = false,
	} = {},
}) => {
	if (precision === 0) {
		precision = 1e-5;
	}

	const details = [];
	let iterations = -1;
	let trueX = typeof relativeError === "number" && relativeError;

	while (true) {
		const prevY = evaluate(func, { x });
		const diffY = derivative(func, "x").evaluate({ x });

		const prevX = x;
		x -= evaluate(func, { x }) / diffY;

		iterations += 1;
		const condition1 = Math.abs(x - prevX);
		const condition2 = Math.abs(evaluate(func, { x }));

		if (relativeError) {
			if (!trueX) trueX = prevX;

			relativeError = Math.abs(x - trueX) / Math.abs(x);
		}

		details.push({
			iteration: iterations,
			prevX: fixNumber(prevX),
			prevY: fixNumber(prevY),
			diffY: fixNumber(diffY),
			x: fixNumber(x),
			...(origFunc && { y: evaluate(origFunc, { x }) }),
			...(relativeError && { relativeError: fixNumber(relativeError as number) }),
			condition1: fixNumber(condition1),
			condition2: fixNumber(condition2),
		});

		// Check if conditions are either disabled or true
		const condition1Pass = !conditionsWhitelist[0] || condition1 < precision;
		const condition2Pass = !conditionsWhitelist[1] || condition2 < precision;

		if (
			(!bail && condition1Pass && condition2Pass) ||
			(bail && (condition1Pass || condition2Pass)) ||
			iterations >= maxIterations
		)
			break;
	}

	return {
		result: {
			iterations,
			x: x.toPrecision(21),
		},
		details,
	};
};

export const secant: FunctionZeros.Secant = ({
	func,
	interval: [a, b],
	precision,
	options: {
		bail = false,
		conditionsWhitelist = [true, true],
		maxIterations = Number.POSITIVE_INFINITY,
		origFunc,
		relativeError = false,
	} = {},
}) => {
	if (precision === 0) {
		precision = 1e-5;
	}

	const details = [];
	let iterations = -1;
	let trueX = typeof relativeError === "number" && relativeError;

	while (true) {
		const results = [evaluate(func, { x: a }), evaluate(func, { x: b })];

		const c = (a * results[1] - b * results[0]) / (results[1] - results[0]);

		iterations += 1;
		const condition1 = Math.abs(c - a);
		const condition2 = Math.abs(evaluate(func, { x: c }));

		if (relativeError) {
			if (!trueX) trueX = b;

			relativeError = Math.abs(c - trueX) / Math.abs(c);
		}

		details.push({
			iteration: iterations,
			interval: [fixNumber(a), fixNumber(b)],
			results: results.map(number => fixNumber(number)),
			x: fixNumber(c),
			...(origFunc && { y: evaluate(origFunc, { x: c }) }),
			...(typeof relativeError === "number" && { relativeError: fixNumber(relativeError) }),
			condition1: fixNumber(condition1),
			condition2: fixNumber(condition2),
		});

		// Check if conditions are either disabled or true
		const condition1Pass = !conditionsWhitelist[0] || condition1 < precision;
		const condition2Pass = !conditionsWhitelist[1] || condition2 < precision;

		if (
			(!bail && condition1Pass && condition2Pass) ||
			(bail && (condition1Pass || condition2Pass)) ||
			iterations >= maxIterations
		)
			break;

		a = b;
		b = c;
	}

	return {
		result: {
			iterations,
			interval: [a.toPrecision(21), b.toPrecision(21)],
		},
		details,
	};
};
