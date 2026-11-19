import type { CdpCallFrameDTO } from "./CdpCallFrame.dto";

/** Node of the call tree in a CDP CPU profile. */
export interface CdpNodeDTO {
	callFrame: CdpCallFrameDTO;
	children?: number[];
	hitCount?: number;
	id: number;
}
