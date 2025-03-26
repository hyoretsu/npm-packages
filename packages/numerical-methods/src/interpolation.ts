import { fixNumber, range } from "@hyoretsu/utils";
import { evaluate } from "mathjs";

import { gaussSeidel } from "./linearSystems";

export type Interpolation = (data: Interpolation.Params) => Interpolation.Return;
export namespace Interpolation {
	export interface Params {
		x: number[];
		y: number[];
		targetX?: number;
	}

	export type Result = string;
	export interface Details {
		targetResult?: number;
	}
	export interface Return {
		result: Interpolation.Result;
		details: Interpolation.Details;
	}

	export type Newton = (data: Interpolation.Newton.Params) => Interpolation.Newton.Return;
	export namespace Newton {
		export type Params = Interpolation.Params;
		export type Return = Interpolation.Return & {
			details: {
				dividedDifferences: number[][];
			};
		};
	}
}

export const interpolationParams = {
	x: "number[]",
	y: "number[]",
	targetX: "number|undefined",
};

export const lagrangeInterpolation: Interpolation = ({ x, y, targetX }) => {
	const polynomial = y
		.map((result, i) => {
			let numerator = "";
			let denominator = 1;

			x.forEach((_, j) => {
				if (j === i) return;

				numerator += `(x ${Math.sign(x[j]) === 1 ? "-" : "+"} ${Math.abs(x[j])})`;
				denominator *= x[i] - x[j];
			});

			return `${result} * (${numerator})/${fixNumber(denominator)}`;
		})
		.reduce((prev, curr) => (prev ? `${prev} + ${curr}` : curr), "");

	return {
		result: polynomial,
		details: {
			...(targetX && {
				targetResult: fixNumber(evaluate(polynomial, { x: targetX })),
			}),
		},
	};
};

export const vandermondeInterpolation: Interpolation = ({ x, y, targetX }) => {
	const dimension = x.length;

	const {
		result: { solution: vandermondeResults },
	} = gaussSeidel({
		coefficients: x.map((coefficient, i) => range(dimension).map(j => coefficient ** j)),
		independentTerms: y,
		precision: 1e-9,
	});

	const polynomial = vandermondeResults.reduce((prev, curr, i) => {
		if (i === 0) return String(fixNumber(curr));

		return `${prev} ${Math.sign(curr) === 1 ? "+" : "-"} ${Math.abs(fixNumber(curr))} * x^${i}`;
	}, "");

	return {
		result: polynomial,
		details: {
			...(targetX && {
				targetResult: fixNumber(evaluate(polynomial, { x: targetX })),
			}),
		},
	};
};

export const newtonInterpolation: Interpolation.Newton = ({ x, y, targetX }) => {
	const dividedDifferences: number[][] = [];

	// Creating all of the divided differences
	x.forEach((_, i) => {
		if (i === 0) {
			dividedDifferences.push(y);
			return;
		}

		const column = [];
		for (let j = 0; j < x.length - i; j++) {
			column.push((dividedDifferences[i - 1][j + 1] - dividedDifferences[i - 1][j]) / (x[i + j] - x[j]));
		}
		dividedDifferences.push(column);
	});

	const polynomial = dividedDifferences
		.map((difference, i) => {
			if (i === 0) return String(difference[0]);

			let literal = "";
			for (let j = 0; j < i; j++) {
				literal += `(x ${Math.sign(x[j]) === 1 ? "-" : "+"} ${Math.abs(x[j])})`;
			}

			return `${Math.sign(difference[0]) === 1 ? "+" : "-"} ${Math.abs(difference[0])} * ${literal}`;
		})
		.join(" ");

	return {
		result: polynomial,
		details: {
			dividedDifferences,
			...(targetX && {
				result: evaluate(polynomial, { x: targetX }),
			}),
		},
	};
};
