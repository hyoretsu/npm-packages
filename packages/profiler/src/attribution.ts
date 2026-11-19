import type { ProfileLabelsDTO } from "./dtos/ProfileLabels.dto";
import type { SampleLabelAssignmentDTO } from "./dtos/SampleLabelAssignment.dto";
import type { TrackedIntervalDTO } from "./dtos/TrackedInterval.dto";

export interface AttributionStats {
	ambiguous: number;
	attributed: number;
	cardinalityLimited: number;
	unattributed: number;
}

export interface AttributionResult {
	assignment: SampleLabelAssignmentDTO | undefined;
	stats: AttributionStats;
}

/** Labels shared by every interval of a group; span ids only when the group is a single span. */
function groupLabels(group: TrackedIntervalDTO[]): ProfileLabelsDTO {
	const first = group[0];
	if (!first) return {};
	if (group.length === 1) {
		return first.kind === "span"
			? { ...first.labels, span_id: first.spanId as string, trace_id: first.traceId as string }
			: { ...first.labels };
	}
	const common: ProfileLabelsDTO = {};
	for (const [key, value] of Object.entries(first.labels)) {
		if (group.every(interval => interval.labels[key] === value)) common[key] = value;
	}
	return common;
}

/**
 * Labels of the samples taken while `active` intervals were open.
 *
 * Spans and tags are two groups merged together (tags win on conflicts). Inside a group: exactly
 * one interval attaches its ids and labels; several attach only the labels with an identical
 * value in all of them (never ids), because a single-threaded sampler cannot tell which of the
 * concurrent requests owns a sample; none attaches nothing.
 */
function resolveLabels(active: TrackedIntervalDTO[]): { ambiguous: boolean; labels: ProfileLabelsDTO } {
	const spans = active.filter(interval => interval.kind === "span");
	const tags = active.filter(interval => interval.kind === "tag");
	return { ambiguous: spans.length > 1, labels: { ...groupLabels(spans), ...groupLabels(tags) } };
}

function setKey(labels: ProfileLabelsDTO): string {
	return JSON.stringify(Object.entries(labels).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/**
 * Attribute every sample to the tracker intervals active at its wall time, in O(samples +
 * intervals * log intervals). Identical label sets are interned; once `maxSets` distinct sets
 * exist, new ones lose their span/trace ids (and are dropped if still new), bounding cardinality.
 *
 * @param sampleTimesMs monotonically non-decreasing wall times, one per sample
 */
export function attributeSamples(
	sampleTimesMs: Float64Array,
	intervals: readonly TrackedIntervalDTO[],
	maxSets: number,
): AttributionResult {
	const stats: AttributionStats = { ambiguous: 0, attributed: 0, cardinalityLimited: 0, unattributed: 0 };
	if (intervals.length === 0 || sampleTimesMs.length === 0) {
		stats.unattributed = sampleTimesMs.length;
		return { assignment: undefined, stats };
	}
	const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
	const sets: ProfileLabelsDTO[] = [];
	const setIndex = new Map<string, number>();
	const indices = new Int32Array(sampleTimesMs.length).fill(-1);

	let next = 0;
	let active: TrackedIntervalDTO[] = [];
	let earliestEnd = Number.POSITIVE_INFINITY;
	let cached: { ambiguous: boolean; index: number; limited: boolean } | undefined;

	const intern = (labels: ProfileLabelsDTO): number | undefined => {
		const key = setKey(labels);
		const existing = setIndex.get(key);
		if (existing !== undefined) return existing;
		if (sets.length >= maxSets) return undefined;
		setIndex.set(key, sets.length);
		sets.push(labels);
		return sets.length - 1;
	};

	for (let i = 0; i < sampleTimesMs.length; i++) {
		const t = sampleTimesMs[i] as number;
		let changed = false;
		while (next < sorted.length && (sorted[next] as TrackedIntervalDTO).startMs <= t) {
			active.push(sorted[next] as TrackedIntervalDTO);
			next++;
			changed = true;
		}
		if (earliestEnd < t || changed) {
			const before = active.length;
			active = active.filter(interval => interval.endMs === null || interval.endMs >= t);
			if (active.length !== before) changed = true;
			earliestEnd = active.reduce(
				(min, interval) => Math.min(min, interval.endMs ?? Number.POSITIVE_INFINITY),
				Number.POSITIVE_INFINITY,
			);
		}
		if (changed || cached === undefined) {
			const { ambiguous, labels } = resolveLabels(active);
			let index: number | undefined = Object.keys(labels).length > 0 ? intern(labels) : -1;
			let limited = false;
			if (index === undefined) {
				limited = true;
				const { span_id: _s, trace_id: _t, ...rest } = labels;
				index = Object.keys(rest).length > 0 ? (intern(rest) ?? -1) : -1;
			}
			cached = { ambiguous, index, limited };
		}
		indices[i] = cached.index;
		if (cached.index >= 0) stats.attributed++;
		else stats.unattributed++;
		if (cached.ambiguous) stats.ambiguous++;
		if (cached.limited) stats.cardinalityLimited++;
	}
	return { assignment: stats.attributed > 0 ? { indices, sets } : undefined, stats };
}
