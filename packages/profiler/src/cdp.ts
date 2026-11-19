import type { CdpNodeDTO } from "./dtos/CdpNode.dto";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";
import type { WallClockAnchorDTO } from "./dtos/WallClockAnchor.dto";

/** Safety cap against malformed (cyclic or absurdly deep) profiles. */
export const MAX_STACK_DEPTH = 512;

export interface CdpTree {
	nodeMap: Map<number, CdpNodeDTO>;
	parentMap: Map<number, number>;
}

/** Index nodes by id and invert the `children` edges. */
export function buildTree(profile: CdpProfileDTO): CdpTree {
	const nodeMap = new Map<number, CdpNodeDTO>();
	const parentMap = new Map<number, number>();
	for (const node of profile.nodes) {
		nodeMap.set(node.id, node);
		for (const child of node.children ?? []) parentMap.set(child, node.id);
	}
	return { nodeMap, parentMap };
}

/** `(root)`, `(idle)` and the profiler's own `node:inspector` frames are not application frames. */
export function isUsableFrame(functionName: string, url: string): boolean {
	return functionName !== "(root)" && functionName !== "(idle)" && url !== "node:inspector";
}

/** Walks leaf to root, calling `visit` for each node until `(root)` or the depth cap. */
export function walkToRoot(tree: CdpTree, leafId: number, visit: (node: CdpNodeDTO) => void): void {
	let current: number | undefined = leafId;
	for (let depth = 0; current !== undefined && depth < MAX_STACK_DEPTH; depth++) {
		const node = tree.nodeMap.get(current);
		if (!node || node.callFrame.functionName === "(root)") return;
		visit(node);
		current = tree.parentMap.get(current);
	}
}

/**
 * Wall-clock time (fractional ms since the UNIX epoch) of every sample. `anchor.startMs` is the
 * wall time of `profile.startTime`; sample `i` happened `sum(timeDeltas[0..i])` microseconds later.
 * Negative deltas (clock regressions) are treated as zero so the series stays monotonic.
 */
export function sampleWallTimesMs(profile: CdpProfileDTO, anchor: WallClockAnchorDTO): Float64Array {
	const count = profile.samples?.length ?? 0;
	const times = new Float64Array(count);
	let elapsedUs = 0;
	for (let i = 0; i < count; i++) {
		elapsedUs += Math.max(0, profile.timeDeltas?.[i] ?? 0);
		times[i] = anchor.startMs + elapsedUs / 1_000;
	}
	return times;
}
