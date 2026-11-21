import { describe, expect, it } from "bun:test";
import { calculateSampleRate, convertToFolded, convertToFoldedWallTime, IDLE_FRAME } from "./converter";
import { makeProfile } from "./test-utils";

describe("convertToFolded", () => {
	it("counts samples per root-to-leaf stack and labels frames with file:line", () => {
		const folded = convertToFolded(makeProfile([["main", "work"], ["main", "work"], ["main"]]));
		expect(folded.split("\n").sort()).toEqual(
			["main (src/handler.ts:9) 1", "main (src/handler.ts:9);work (src/handler.ts:9) 2"].sort(),
		);
	});

	it("drops idle, root-only and inspector frames", () => {
		const folded = convertToFolded(makeProfile([["(idle)"], ["(program)", "x"]]));
		expect(folded).toContain("(program)");
		expect(folded).not.toContain("(idle)");
		expect(convertToFolded(makeProfile([["(idle)"]]))).toBe("");
	});

	it("returns an empty string for an empty profile", () => {
		expect(convertToFolded({ endTime: 0, nodes: [], samples: [], startTime: 0, timeDeltas: [] })).toBe(
			"",
		);
	});

	it("sanitizes control characters that would corrupt folded records", () => {
		const folded = convertToFolded(makeProfile([["bad\nname\t1"]]));
		expect(folded.split("\n")).toHaveLength(1);
		expect(folded).toMatch(/^bad name 1 \(src\/handler\.ts:9\) 1$/);
	});
});

describe("convertToFoldedWallTime", () => {
	const lines = (folded: string) =>
		Object.fromEntries(
			folded
				.split("\n")
				.map(line => [
					line.slice(0, line.lastIndexOf(" ")),
					Number(line.slice(line.lastIndexOf(" ") + 1)),
				]),
		);

	it("weights samples by elapsed microseconds", () => {
		const parsed = lines(convertToFoldedWallTime(makeProfile([["a"], ["a"], ["b"]]), 10_000));
		expect(parsed["a (src/handler.ts:9)"]).toBe(20_000);
		expect(parsed["b (src/handler.ts:9)"]).toBe(10_000);
	});

	it("books a gap longer than two intervals to (idle) instead of the resumed stack", () => {
		const profile = makeProfile([["a"], { deltaUs: 300_000, stack: ["resumed"] }], {
			intervalUs: 10_000,
		});
		const parsed = lines(convertToFoldedWallTime(profile, 10_000));
		expect(parsed["resumed (src/handler.ts:9)"]).toBe(10_000);
		expect(parsed[IDLE_FRAME]).toBe(290_000);
	});

	it("takes engine-emitted (idle) samples at face value and ignores negative deltas", () => {
		const profile = makeProfile([
			{ deltaUs: 500_000, stack: ["(idle)"] },
			{ deltaUs: -5, stack: ["a"] },
		]);
		const parsed = lines(convertToFoldedWallTime(profile, 10_000));
		expect(parsed["(idle)"]).toBe(500_000);
		expect(parsed["a (src/handler.ts:9)"]).toBeUndefined();
	});
});

describe("calculateSampleRate", () => {
	it("derives Hz from samples over duration, falling back to 100", () => {
		expect(calculateSampleRate(makeProfile([["a"], ["a"]], { intervalUs: 500_000 }))).toBe(2);
		expect(
			calculateSampleRate({ endTime: 0, nodes: [], samples: [], startTime: 0, timeDeltas: [] }),
		).toBe(100);
	});
});
