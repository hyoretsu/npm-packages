import type { SpanTrackerStatsDTO } from "./SpanTrackerStats.dto";

/** Trace attribution counters. */
export interface TracingStatsDTO extends SpanTrackerStatsDTO {
	/** Samples with more than one overlapping span (only common labels were attached). */
	ambiguousSamples: number;
	/** Samples that received span/tag labels. */
	attributedSamples: number;
	/** Samples that lost their span ids to the `maxSampleLabelSets` cardinality guard. */
	cardinalityLimitedSamples: number;
	/** Alignment error (ms) of the most recent window's wall-clock anchor. */
	lastAnchorUncertaintyMs: number | null;
	/** Samples with no active span or tag. */
	unattributedSamples: number;
}
