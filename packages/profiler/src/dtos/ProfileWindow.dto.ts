import type { CdpProfileDTO } from "./CdpProfile.dto";
import type { ProfileLabelsDTO } from "./ProfileLabels.dto";
import type { ProfileTypeDTO } from "./ProfileType.dto";
import type { SampleLabelAssignmentDTO } from "./SampleLabelAssignment.dto";

/**
 * An immutable, completed profiling window delivered to exporters. The wrapper and window labels
 * are frozen; the CDP payload is treated as readonly but not recursively frozen (that would add
 * measurable overhead on every window).
 */
export interface ProfileWindowDTO {
	readonly appName: string;
	/** Window start, UNIX seconds. */
	readonly from: number;
	/** Folded stacks (`a;b;c count`), weighted by sample count (cpu) or microseconds (wall). */
	readonly folded: string;
	/** Window-level labels, bounded cardinality. */
	readonly labels: Readonly<ProfileLabelsDTO>;
	readonly profile: CdpProfileDTO;
	readonly sampleIntervalUs: number;
	/** Per-sample labels derived from tracked spans/tags. Only the pprof encoders can carry them. */
	readonly sampleLabels?: SampleLabelAssignmentDTO;
	readonly sampleRate: number;
	readonly type: ProfileTypeDTO;
	/** Window end, UNIX seconds. */
	readonly until: number;
}
