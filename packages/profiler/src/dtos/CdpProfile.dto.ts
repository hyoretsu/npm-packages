import type { CdpNodeDTO } from "./CdpNode.dto";

/**
 * CPU profile returned by `Profiler.stop`. Times are microseconds on the engine's monotonic clock;
 * `timeDeltas[i]` is the time between sample `i - 1` (or `startTime`) and sample `i`.
 */
export interface CdpProfileDTO {
	endTime: number;
	nodes: CdpNodeDTO[];
	samples: number[];
	startTime: number;
	timeDeltas: number[];
}
