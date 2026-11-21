import type { CdpNodeDTO } from "./dtos/CdpNode.dto";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";
import type { ProfileWindowDTO } from "./dtos/ProfileWindow.dto";

/** Test helper: builds a CDP profile from root-to-leaf function-name stacks, one entry per sample. */
export function makeProfile(
	stacks: Array<string[] | { deltaUs?: number; stack: string[] }>,
	options: { intervalUs?: number; startTime?: number } = {},
): CdpProfileDTO {
	const intervalUs = options.intervalUs ?? 10_000;
	const nodes: CdpNodeDTO[] = [
		{
			callFrame: { columnNumber: -1, functionName: "(root)", lineNumber: -1, scriptId: "0", url: "" },
			children: [],
			id: 1,
		},
	];
	const byPath = new Map<string, number>();
	const samples: number[] = [];
	const timeDeltas: number[] = [];
	for (const entry of stacks) {
		const { stack, deltaUs } = Array.isArray(entry) ? { deltaUs: undefined, stack: entry } : entry;
		let parent = 1;
		let path = "";
		for (const name of stack) {
			path += `/${name}`;
			let id = byPath.get(path);
			if (id === undefined) {
				id = nodes.length + 1;
				byPath.set(path, id);
				nodes.push({
					callFrame: {
						columnNumber: 0,
						functionName: name,
						lineNumber: 9,
						scriptId: "1",
						url: name.startsWith("(") ? "" : "file:///app/src/handler.ts",
					},
					children: [],
					id,
				});
				nodes[parent - 1]?.children?.push(id);
			}
			parent = id;
		}
		samples.push(parent);
		timeDeltas.push(deltaUs ?? intervalUs);
	}
	const startTime = options.startTime ?? 1_000_000;
	return {
		endTime: startTime + timeDeltas.reduce((a, b) => a + b, 0),
		nodes,
		samples,
		startTime,
		timeDeltas,
	};
}

/** Test helper: a window around `profile`. */
export function makeWindow(
	profile: CdpProfileDTO,
	overrides: Partial<ProfileWindowDTO> = {},
): ProfileWindowDTO {
	return {
		appName: "test-app",
		folded: "a;b 1",
		from: 1_700_000_000,
		labels: { service_name: "test-app" },
		profile,
		sampleIntervalUs: 10_000,
		sampleRate: 100,
		type: "cpu",
		until: 1_700_000_015,
		...overrides,
	};
}
