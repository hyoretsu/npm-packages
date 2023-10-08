import { fixNumber, range, swap } from "@hyoretsu/utils";
import { evaluate } from "mathjs";

export type Matrix = number[][];

export interface LUMatrices {
	l: Matrix;
	u: Matrix;
}

const matrixParam = "number[][]";

export const luCompositionParams = {
	l: matrixParam,
	u: matrixParam,
};

export const luComposition = ({ l, u }: LUMatrices): Matrix => {
	if (l.length !== l[0].length || u.length !== u[0].length) {
		throw new Error("Both matrices must be square");
	}

	const matrix = [...l.map(line => line.map(() => 0))];

	u[0].forEach((number, i) => {
		matrix[0][i] = number;
	});

	const uColumns: number[][] = [];
	u.forEach((line, i) => {
		line.forEach((number, j) => {
			if (number === 0) return;

			if (uColumns[j] === undefined) {
				uColumns[j] = [];
			}

			uColumns[j].push(number);
		});
	});

	matrix.slice(1).forEach((line, i) => {
		i += 1;

		const lineL: number[] = [];
		l[i].forEach((number, j) => {
			if (j < i) {
				lineL.push(number);
			}
		});

		line.forEach((_, j) => {
			matrix[i][j] = uColumns[j].reduce((sum, number, index) => {
				if (index > i) {
					return sum;
				}

				if (index === i) {
					return sum + number;
				}

				return sum + lineL[index] * number;
			}, 0);
		});
	});

	return matrix;
};

export const doolittleLuDecompositionParams = {
	matrix: matrixParam,
};

// Bug com matriz 4x4
export const doolittleLuDecomposition = (matrix: Matrix): LUMatrices => {
	if (matrix.length !== matrix[0].length) {
		throw new Error("Matrix must be square");
	}

	const l: Matrix = [...matrix.map((line, i) => line.map((_, j) => (i === j ? 1 : 0)))];
	const u: Matrix = [...matrix.map(line => line.map(() => 0))];

	matrix.forEach((line, i) => {
		line.forEach((number, j) => {
			if (j < i) {
				if (j === 0) {
					l[i][0] = number / u[0][0];
					return;
				}

				l[i][j] =
					(number -
						range(j)
							.map(index => l[i][index] * u[index][j])
							.reduce((n, sum) => sum + n, 0)) /
					u[j][j];
				return;
			}

			if (i === 0) {
				u[0][j] = matrix[0][j];
				return;
			}

			u[i][j] =
				number -
				range(i)
					.map(index => l[i][index] * u[index][j])
					.reduce((n, sum) => sum + n, 0);
		});
	});

	return {
		l,
		u,
	};
};

export interface LinearSystem {
	coefficients: Matrix;
	independentTerms: number[];
}

const linearSystemParams = {
	coefficients: matrixParam,
	independentTerms: "number[]",
};

export const gaussianEliminationParams = linearSystemParams;

export const gaussianElimination = ({ coefficients, independentTerms }: LinearSystem) => {
	const coefficientsL = [...coefficients];
	const independentTermsL = [...independentTerms];

	const transformedFuncs = [];
	const results = {};
	const steps = [];

	for (let j = 0; j < coefficients.length; j++) {
		let highestLine = j;

		// Find the correct pivot's line
		for (let i = j; i < coefficients.length; i++) {
			if (i === j) continue;

			if (coefficientsL[i][j] > coefficientsL[highestLine][j]) {
				highestLine = i;
			}
		}

		swap(coefficientsL, j, highestLine);
		swap(independentTermsL, j, highestLine);
		steps.push(
			coefficientsL.map((line, i) => [
				...line.map(number => number.toFixed(2)),
				independentTermsL[i].toFixed(2),
			]),
		);

		const multipliers = [];

		// Find multipliers for each line
		for (let i = j + 1; i < coefficients.length; i++) {
			multipliers[i] = coefficientsL[i][j] / coefficientsL[j][j];
		}

		// Transform next lines with multipliers
		for (let i = j + 1; i < coefficients.length; i++) {
			for (let k = j; k < coefficients.length; k++) {
				coefficientsL[i][k] -= multipliers[i] * coefficientsL[j][k];
			}

			independentTermsL[i] -= multipliers[i] * independentTermsL[j];
		}
	}

	console.log(steps);
	console.log(coefficients);

	// Solve the system
	for (let i = coefficients.length - 1; i >= 0; i--) {
		let equation = "";

		for (let j = 0; j < coefficients.length; j++) {
			if (coefficientsL[i][j] === 0) continue;

			if (equation === "") {
				equation = `${String.fromCharCode("a".charCodeAt(0) + j)} = () / ${coefficientsL[i][j]}`;
				continue;
			}

			equation = equation.replace(
				/\((.*)\)/,
				`($1-${coefficientsL[i][j]}${String.fromCharCode("a".charCodeAt(0) + j)} + )`,
			);
		}
		console.log(equation);
		equation = equation.replace(/\((.*)\)/, `($1${independentTermsL[i]})`);
		transformedFuncs.push(equation);
		console.log(equation);

		evaluate(equation, results);
	}

	return {
		transformedFuncs,
		results,
		steps,
	};
};

export const spectralRadiusParams = {
	coefficients: matrixParam,
};

export const spectralRadius = (coefficients: Matrix): number => {
	return Math.max(
		...coefficients.map(
			(number, i) => number.reduce((prev, curr) => prev + Math.abs(curr), 0) / Math.abs(number[i]),
		),
	);
};

export type GaussMethod = (
	data: LinearSystem & {
		precision: number;
		options?: {
			/** Maximum number of iterations. */
			maxIterations?: number;
		};
	},
) => [
	results: {
		iterations: number;
		iterationFunc: string[];
		spectralRadius: number;
		solution: number[];
	},
	details: Array<{
		iteration: number;
		currentGuess: number[];
		nextGuess: number[];
		absoluteError: number;
		relativeError: number;
	}>,
];

export const gaussMethodParams = {
	...linearSystemParams,
	precision: "number",
	options: {
		maxIterations: "number",
	},
};

export const gaussJacobi: GaussMethod = ({
	coefficients,
	independentTerms,
	precision,
	options: { maxIterations = Infinity } = {},
}) => {
	const coefficientsL = [...coefficients];
	const independentTermsL = [...independentTerms];

	const details = [];
	let iterations = 0;

	const dimension = independentTerms.length;
	// Creating iteration functions
	const iterationFunc = independentTermsL.map((number, i) => {
		return [
			...range(dimension - 1).map(j => {
				const correctJ = j >= i ? j + 1 : j;

				return `${
					-coefficientsL[i][correctJ] / coefficientsL[i][i]
				} * ${String.fromCharCode("a".charCodeAt(0) + correctJ)} + `;
			}),
			String(number / coefficientsL[i][i]),
		].join("");
	});
	let guess = independentTermsL.map((number, i) => number / coefficientsL[i][i]);

	while (true) {
		const prevGuess = guess;

		// Applying guesses to the iteration functions
		guess = iterationFunc.map((func, i) =>
			evaluate(
				func,
				// Merging all guesses in a single object
				guess.reduce((prev, curr) => {
					return {
						...prev,
						[String.fromCharCode("a".charCodeAt(0) + Object.entries(prev).length)]: curr,
					};
				}, {}),
			),
		);

		iterations += 1;
		const absoluteError = Math.max(...guess.map((current, i) => Math.abs(current - prevGuess[i])));
		const relativeError = absoluteError / Math.max(...guess);

		details.push({
			iteration: iterations,
			currentGuess: prevGuess.map(number => fixNumber(number)),
			nextGuess: guess.map(number => fixNumber(number)),
			absoluteError: fixNumber(absoluteError),
			relativeError: fixNumber(relativeError),
		});

		if (relativeError < precision || iterations >= maxIterations) break;
	}

	return [
		{
			iterations,
			iterationFunc,
			spectralRadius: spectralRadius(coefficients),
			solution: guess,
		},
		details,
	];
};

export const gaussSeidel: GaussMethod = ({
	coefficients,
	independentTerms,
	precision,
	options: { maxIterations = Infinity } = {},
}) => {
	const coefficientsL = [...coefficients];
	const independentTermsL = [...independentTerms];

	const details = [];
	let iterations = 0;

	const dimension = independentTerms.length;
	// Creating iteration functions
	const iterationFunc = independentTermsL.map((number, i) => {
		return [
			...range(dimension - 1).map(j => {
				const correctJ = j >= i ? j + 1 : j;

				return `${
					-coefficientsL[i][correctJ] / coefficientsL[i][i]
				} * ${String.fromCharCode("a".charCodeAt(0) + correctJ)} + `;
			}),
			String(number / coefficientsL[i][i]),
		].join("");
	});
	const guess = independentTermsL.map(_ => 0);

	while (true) {
		const prevGuess = [...guess];

		// Applying each guess to the next iteration function
		iterationFunc.forEach((func, i) => {
			guess[i] = evaluate(
				func,
				// Merging all guesses in a single object
				guess.reduce(
					(prev, curr) => ({
						...prev,
						[String.fromCharCode("a".charCodeAt(0) + Object.entries(prev).length)]: curr,
					}),
					{},
				),
			);
		});

		iterations += 1;
		const absoluteError = Math.max(...guess.map((current, i) => Math.abs(current - prevGuess[i])));
		const relativeError = absoluteError / Math.max(...guess);

		details.push({
			iteration: iterations,
			currentGuess: prevGuess.map(number => fixNumber(number)),
			nextGuess: guess.map(number => fixNumber(number)),
			absoluteError: fixNumber(absoluteError),
			relativeError: fixNumber(relativeError),
		});

		if ((iterations > 0 && relativeError < precision) || iterations >= maxIterations) break;
	}

	return [
		{
			iterations,
			iterationFunc,
			spectralRadius: spectralRadius(coefficients),
			solution: guess,
		},
		details,
	];
};
