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
 * Keeps intervals in insertion (= start) order in a `Map`, which makes oldest-first eviction O(1).
 *
 * Memory is bounded three ways: a hard cap on retained intervals (oldest evicted first, closed ones
 * preferred), force-closing open intervals older than `maxSpanAgeMs` (a span whose `end` is never
 * called cannot leak), and `prune` after each converted window. A force-closed or evicted interval
 * that is still referenced by an unconverted window keeps working because snapshots hold references.
 */
export class IntervalSpanTracker extends SpanTracker {
	private readonly intervals = new Map<number, TrackedIntervalDTO>();
	private evictedIntervals = 0;
	private invalidSpans = 0;
	private readonly maxIntervals: number;
	private readonly maxSpanAgeMs: number;
	private readonly now: () => number;
	private nextId = 1;
	private orphanedIntervals = 0;

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
		while (this.intervals.size >= this.maxIntervals) this.evictOldest();
		const interval: TrackedIntervalDTO = { ...fields, endMs: null, id: this.nextId++, startMs };
		this.intervals.set(interval.id, interval);
		return finalLabels => {
			if (interval.endMs === null) interval.endMs = this.now();
			// A late label (for example `http.route`) still applies to every unconverted window.
			if (finalLabels)
				Object.assign(interval.labels, validateLabels(finalLabels, false, RESERVED_LABELS));
		};
	}

	private evictOldest(): void {
		let victim: TrackedIntervalDTO | undefined;
		for (const interval of this.intervals.values()) {
			victim ??= interval;
			if (interval.endMs !== null) {
				victim = interval;
				break;
			}
		}
		if (!victim) return;
		this.intervals.delete(victim.id);
		this.evictedIntervals++;
	}

	/** Force-close open intervals that outlived `maxSpanAgeMs`. Insertion order lets us stop early. */
	private expireOrphans(nowMs: number): void {
		for (const interval of this.intervals.values()) {
			if (nowMs - interval.startMs <= this.maxSpanAgeMs) break;
			if (interval.endMs === null) {
				interval.endMs = interval.startMs + this.maxSpanAgeMs;
				this.orphanedIntervals++;
			}
		}
	}

	prune(beforeMs: number): number {
		this.expireOrphans(this.now());
		let dropped = 0;
		for (const [id, interval] of this.intervals) {
			if (interval.endMs !== null && interval.endMs < beforeMs) {
				this.intervals.delete(id);
				dropped++;
			}
		}
		return dropped;
	}

	snapshot(fromMs: number, untilMs: number): TrackedIntervalDTO[] {
		return [...this.intervals.values()].filter(
			interval => interval.startMs <= untilMs && (interval.endMs === null || interval.endMs >= fromMs),
		);
	}

	stats(): SpanTrackerStatsDTO {
		let active = 0;
		for (const interval of this.intervals.values()) if (interval.endMs === null) active++;
		return {
			activeIntervals: active,
			evictedIntervals: this.evictedIntervals,
			invalidSpans: this.invalidSpans,
			orphanedIntervals: this.orphanedIntervals,
			retainedIntervals: this.intervals.size,
		};
	}
}
