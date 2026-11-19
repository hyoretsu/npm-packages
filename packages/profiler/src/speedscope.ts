import { buildTree, walkToRoot } from "./cdp";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";

/** Convert a CDP profile to the speedscope "sampled" file format (microsecond weights). */
export function convertToSpeedscope(profile: CdpProfileDTO, name = "profiler"): object {
	const tree = buildTree(profile);
	const frames: Array<{ col?: number; file?: string; line?: number; name: string }> = [];
	const frameIndex = new Map<number, number>();
	const samples: number[][] = [];
	const weights: number[] = [];

	for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
		const stack: number[] = [];
		walkToRoot(tree, profile.samples[i] as number, node => {
			if (node.callFrame.url === "node:inspector") return;
			let index = frameIndex.get(node.id);
			if (index === undefined) {
				index = frames.length;
				frameIndex.set(node.id, index);
				frames.push({
					name: node.callFrame.functionName.trim() || "(anonymous)",
					...(node.callFrame.url ? { file: node.callFrame.url } : {}),
					...(node.callFrame.lineNumber >= 0 ? { line: node.callFrame.lineNumber + 1 } : {}),
					...(node.callFrame.columnNumber >= 0 ? { col: node.callFrame.columnNumber + 1 } : {}),
				});
			}
			stack.push(index);
		});
		if (stack.length > 0) {
			samples.push(stack.reverse());
			weights.push(Math.max(0, profile.timeDeltas?.[i] ?? 0));
		}
	}

	return {
		$schema: "https://www.speedscope.app/file-format-schema.json",
		activeProfileIndex: 0,
		name,
		profiles: [
			{
				endValue: weights.reduce((sum, value) => sum + value, 0),
				name,
				samples,
				startValue: 0,
				type: "sampled",
				unit: "microseconds",
				weights,
			},
		],
		shared: { frames },
	};
}
