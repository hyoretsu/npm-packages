import type { ProfileLabelsDTO } from "./ProfileLabels.dto";

/**
 * Per-sample labels, stored compactly: `indices[i]` is the position in `sets` of the labels of
 * `profile.samples[i]`, or `-1` when the sample has none. Identical label sets are interned.
 */
export interface SampleLabelAssignmentDTO {
	indices: ArrayLike<number>;
	sets: readonly ProfileLabelsDTO[];
}
