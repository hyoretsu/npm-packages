import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { SpanTrackerOptionsDTO } from "../dtos/SpanTrackerOptions.dto";
import type { SpanTrackerStatsDTO } from "../dtos/SpanTrackerStats.dto";
import type { TraceSpanDTO } from "../dtos/TraceSpan.dto";
import type { TrackedIntervalDTO } from "../dtos/TrackedInterval.dto";
import { RESERVED_LABELS, validateLabels } from "../labels";
import { type EndInterval, SpanTracker } from "../models/SpanTracker";
import { preciseNowMs } from "../wall-clock";

const TRACE_ID = /^[0-9a-f]{32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;
const NOOP: EndInterval = () => undefined;

/**
 * Keeps intervals in start order in an array with a moving head, which makes oldest-first
 * eviction and orphan expiry O(1) amortized. (An insertion-ordered `Map` with front deletions looks
 * equivalent but is pathological in JavaScriptCore: every `values().next()` has to skip the
 * tombstones of earlier deletions, which measured ~55 us per span.)
 *
 * Memory is bounded three ways: a hard cap on retained intervals (oldest evicted first),
 * force-closing open intervals older than `maxSpanAgeMs` (a span whose `end` is never called cannot
 * leak), and `prune` after each converted window. An evicted or force-closed interval that an
 * unconverted window still references keeps working, because snapshots hold references.
 */
export class IntervalSpanTracker extends SpanTracker {
	private activeIntervals = 0;
	private readonly detached = new WeakSet<TrackedIntervalDTO>();
	private evictedIntervals = 0;
	private head = 0;
	private invalidSpans = 0;
	private items: TrackedIntervalDTO[] = [];
	private readonly maxIntervals: number;
	private readonly maxSpanAgeMs: number;
	private nextId = 1;
	private readonly now: () => number;
	private orphanedIntervals = 0;
	/** Index before which every open interval has already been checked for expiry. */
	private scanned = 0;

	constructor(options: SpanTrackerOptionsDTO = {}) {
		super();
		this.maxIntervals = Math.max(1, options.maxIntervals ?? 10_000);
		this.maxSpanAgeMs = Math.max(1, options.maxSpanAgeMs ?? 300_000);
		this.now = options.now ?? preciseNowMs;
	}

	beginSpan(span: TraceSpanDTO): EndInterval {
		const traceId = typeof span?.traceId === "string" ? span.traceId.toLowerCase() : "";
		const spanId = typeof span?.spanId === "string" ? span.spanId.toLowerCase() : "";
		if (!TRACE_ID.test(traceId) || !SPAN_ID.test(spanId)) {
			this.invalidSpans++;
			return NOOP;
		}
		return this.open({
			kind: "span",
			labels: validateLabels(span.labels, false, RESERVED_LABELS),
			spanId,
			traceId,
		});
	}

	beginLabels(labels: ProfileLabelsDTO): EndInterval {
		return this.open({ kind: "tag", labels: validateLabels(labels, false, RESERVED_LABELS) });
	}

	private open(fields: Pick<TrackedIntervalDTO, "kind" | "labels" | "spanId" | "traceId">): EndInterval {
		const startMs = this.now();
		this.expireOrphans(startMs);
		while (this.items.length - this.head >= this.maxIntervals) this.evictOldest();
		const interval: TrackedIntervalDTO = { ...fields, endMs: null, id: this.nextId++, startMs };
		this.items.push(interval);
		this.activeIntervals++;
		return finalLabels => {
			if (interval.endMs === null) {
				interval.endMs = this.now();
				if (!this.detached.has(interval)) this.activeIntervals--;
			}
			// A late label (for example `http.route`) still applies to every unconverted window.
			if (finalLabels)
				Object.assign(interval.labels, validateLabels(finalLabels, false, RESERVED_LABELS));
		};
	}

	private evictOldest(): void {
		const victim = this.items[this.head];
		if (!victim) return;
		this.items[this.head++] = undefined as never;
		this.detached.add(victim);
		if (victim.endMs === null) this.activeIntervals--;
		this.evictedIntervals++;
		this.compact();
	}

	/** Force-close open intervals that outlived `maxSpanAgeMs`. Start order lets us stop early. */
	private expireOrphans(nowMs: number): void {
		this.scanned = Math.max(this.scanned, this.head);
		while (this.scanned < this.items.length) {
			const interval = this.items[this.scanned] as TrackedIntervalDTO;
			if (nowMs - interval.startMs <= this.maxSpanAgeMs) return;
			if (interval.endMs === null) {
				interval.endMs = interval.startMs + this.maxSpanAgeMs;
				this.activeIntervals--;
				this.orphanedIntervals++;
			}
			this.scanned++;
		}
	}

	private compact(): void {
		if (this.head < 1_024 || this.head * 2 < this.items.length) return;
		this.items = this.items.slice(this.head);
		this.scanned = Math.max(0, this.scanned - this.head);
		this.head = 0;
	}

	prune(beforeMs: number): number {
		this.expireOrphans(this.now());
		const live = this.items.slice(this.head);
		const kept = live.filter(interval => interval.endMs === null || interval.endMs >= beforeMs);
		this.items = kept;
		this.head = 0;
		this.scanned = 0;
		return live.length - kept.length;
	}

	snapshot(fromMs: number, untilMs: number): TrackedIntervalDTO[] {
		const result: TrackedIntervalDTO[] = [];
		for (let i = this.head; i < this.items.length; i++) {
			const interval = this.items[i] as TrackedIntervalDTO;
			if (interval.startMs <= untilMs && (interval.endMs === null || interval.endMs >= fromMs))
				result.push(interval);
		}
		return result;
	}

	stats(): SpanTrackerStatsDTO {
		return {
			activeIntervals: this.activeIntervals,
			evictedIntervals: this.evictedIntervals,
			invalidSpans: this.invalidSpans,
			orphanedIntervals: this.orphanedIntervals,
			retainedIntervals: this.items.length - this.head,
		};
	}
}
