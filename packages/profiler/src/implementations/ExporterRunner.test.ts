import { describe, expect, it } from "bun:test";
import { ExporterError } from "../errors/ExporterError";
import type { ProfileExporter } from "../models/ProfileExporter";
import { makeProfile, makeWindow } from "../test-utils";
import { ExporterRunner } from "./ExporterRunner";

const window = makeWindow(makeProfile([["a"]]));
const instantWait = async () => undefined;

function runner(
	exporter: ProfileExporter,
	options: Partial<ConstructorParameters<typeof ExporterRunner>[1]> = {},
) {
	return new ExporterRunner(exporter, {
		debug: () => undefined,
		maxPending: 2,
		maxRetries: 2,
		random: () => 0,
		wait: instantWait,
		...options,
	});
}

describe("ExporterRunner", () => {
	it("exports a window and records bytes reported by the exporter", async () => {
		const r = runner({ export: async () => ({ bytes: 123 }), name: "ok" });
		r.enqueue(window);
		await r.waitForIdle();
		expect(r.stats()).toMatchObject({
			exportedBytes: 123,
			exportedProfiles: 1,
			failedProfiles: 0,
			queueDepth: 0,
		});
		expect(r.stats().lastSuccessAt).not.toBeNull();
	});

	it("retries retryable failures up to maxRetries then succeeds", async () => {
		let calls = 0;
		const r = runner({
			export: async () => {
				if (++calls < 3) throw new ExporterError("boom");
			},
			name: "flaky",
		});
		r.enqueue(window);
		await r.waitForIdle();
		expect(calls).toBe(3);
		expect(r.stats()).toMatchObject({ exportedProfiles: 1, failedProfiles: 0, retries: 2 });
	});

	it("gives up after maxRetries and records the failure", async () => {
		let calls = 0;
		const r = runner({
			export: async () => {
				calls++;
				throw new Error("always");
			},
			name: "bad",
		});
		r.enqueue(window);
		await r.waitForIdle();
		expect(calls).toBe(3);
		expect(r.stats()).toMatchObject({ exportedProfiles: 0, failedProfiles: 1, lastError: "always" });
	});

	it("does not retry non-retryable errors", async () => {
		let calls = 0;
		const r = runner({
			export: async () => {
				calls++;
				throw new ExporterError("bad request", { retryable: false, status: 400 });
			},
			name: "4xx",
		});
		r.enqueue(window);
		await r.waitForIdle();
		expect(calls).toBe(1);
		expect(r.stats()).toMatchObject({ failedProfiles: 1, retries: 0 });
	});

	it("passes Retry-After to the backoff", async () => {
		const delays: number[] = [];
		let calls = 0;
		const r = runner(
			{
				export: async () => {
					if (++calls === 1) throw new ExporterError("slow down", { retryAfterMs: 7_000 });
				},
				name: "ra",
			},
			{ wait: async ms => void delays.push(ms) },
		);
		r.enqueue(window);
		await r.waitForIdle();
		expect(delays).toEqual([7_000]);
	});

	it("drops the oldest queued window when the queue is full", async () => {
		const seen: number[] = [];
		let release: () => void = () => undefined;
		const gate = new Promise<void>(resolve => (release = resolve));
		const r = runner(
			{
				export: async w => {
					await gate;
					seen.push(w.from);
				},
				name: "slow",
			},
			{ maxPending: 2 },
		);
		for (const from of [1, 2, 3, 4, 5]) r.enqueue(makeWindow(window.profile, { from }));
		// 1 is in flight; 2..5 compete for two queue slots: 2 and 3 are dropped.
		expect(r.stats()).toMatchObject({ droppedProfiles: 2, queueDepth: 2 });
		release();
		await r.waitForIdle();
		expect(seen).toEqual([1, 4, 5]);
	});

	it("abortAndDrop aborts the in-flight attempt, drops the queue and resolves waiters", async () => {
		let aborted = false;
		const r = runner({
			export: (_w, signal) =>
				new Promise<void>((_resolve, reject) => {
					signal?.addEventListener("abort", () => {
						aborted = true;
						reject(new ExporterError("aborted", { retryable: false }));
					});
				}),
			name: "hang",
		});
		r.enqueue(window);
		r.enqueue(window);
		const idle = r.waitForIdle();
		r.abortAndDrop();
		await idle;
		expect(aborted).toBe(true);
		expect(r.stats().droppedProfiles).toBeGreaterThanOrEqual(2);
		r.enqueue(window);
		expect(r.stats().lastError).toContain("shutting down");
	});

	it("calls the exporter's shutdown hook", async () => {
		let closed = false;
		const r = runner({
			export: async () => undefined,
			name: "s",
			shutdown: async () => {
				closed = true;
			},
		});
		await r.shutdown();
		expect(closed).toBe(true);
	});
});
