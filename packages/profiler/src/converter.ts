import { buildTree, isUsableFrame, walkToRoot } from "./cdp";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";

/** Frame used to bucket time the process spent parked off-CPU. */
export const IDLE_FRAME = "(idle)";

const DEFAULT_SAMPLE_INTERVAL_US = 10_000;

/**
 * Strip control characters (C0 + DEL) from a frame label. Folded output is newline-delimited and
 * Pyroscope parses the token after the last space as an integer, so a raw newline inside a function
 * name or URL would split a record and make `/ingest` answer `422 strconv.Atoi: invalid syntax`.
 */
function sanitizeFrameText(text: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional, these bytes corrupt folded records.
	return text.replace(/[\x00-\x1f\x7f]/g, " ");
}

/**
 * Human-readable frame label: `name (dir/file.ts:line)`. `file://` URLs keep only their last two
 * path segments to avoid `/home/user/project/...` noise in flame graphs.
 */
function frameLabel(callFrame: { functionName: string; lineNumber: number; url: string }): string {
	const name = sanitizeFrameText(callFrame.functionName).trim() || "(anonymous)";
	if (!callFrame.url) return name;
	let shortUrl = callFrame.url;
	if (shortUrl.startsWith("file://")) shortUrl = shortUrl.slice(7).split("/").slice(-2).join("/");
	shortUrl = sanitizeFrameText(shortUrl);
	return callFrame.lineNumber >= 0
		? `${name} (${shortUrl}:${callFrame.lineNumber})`
		: `${name} (${shortUrl})`;
}

/** Memoized root-to-leaf folded stack per leaf node (many samples share the same leaf). */
function stackResolver(profile: CdpProfileDTO, keepIdle: boolean): (leafId: number) => string[] | undefined {
	const tree = buildTree(profile);
	const cache = new Map<number, string[] | undefined>();
	return leafId => {
		if (cache.has(leafId)) return cache.get(leafId);
		if (!tree.nodeMap.has(leafId)) {
			cache.set(leafId, undefined);
			return undefined;
		}
		const frames: string[] = [];
		walkToRoot(tree, leafId, node => {
			const { functionName, url } = node.callFrame;
			const usable = keepIdle ? url !== "node:inspector" : isUsableFrame(functionName, url);
			if (usable) frames.push(frameLabel(node.callFrame));
		});
		frames.reverse();
		cache.set(leafId, frames);
		return frames;
	};
}

/**
 * Convert a CDP CPU profile to Pyroscope's folded format, weighted by sample count. Idle and
 * engine-only samples are dropped.
 *
 * @returns `a;b;c 42` lines, or `""` when the profile has no usable samples.
 */
export function convertToFolded(profile: CdpProfileDTO): string {
	if (!profile.samples?.length) return "";
	const resolve = stackResolver(profile, false);
	const counts = new Map<string, number>();
	for (const leafId of profile.samples) {
		const frames = resolve(leafId);
		if (!frames?.length) continue;
		const key = frames.join(";");
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts].map(([stack, count]) => `${stack} ${count}`).join("\n");
}

/**
 * Convert a CDP profile to folded stacks weighted by wall-clock microseconds, surfacing off-CPU
 * time as an explicit `(idle)` frame.
 *
 * `timeDeltas[i]` covers the time since the previous sample. While the process is parked awaiting
 * I/O the sampler emits no samples, so the first sample after a wait carries the whole wait. Blaming
 * the resumed function for it points at precisely the wrong line, so a delta larger than
 * `2 * sampleIntervalUs` is treated as a sampling gap: the stack is credited one interval and the
 * remainder is booked to `(idle)`. (JavaScriptCore emits no idle samples at all; V8 does, and those
 * are taken at face value.) This shows how much time went off-CPU, not which call was waiting.
 */
export function convertToFoldedWallTime(
	profile: CdpProfileDTO,
	sampleIntervalUs: number = DEFAULT_SAMPLE_INTERVAL_US,
): string {
	const { samples, timeDeltas } = profile;
	if (!samples?.length || !timeDeltas?.length) return "";
	const intervalUs = sampleIntervalUs > 0 ? sampleIntervalUs : DEFAULT_SAMPLE_INTERVAL_US;
	const gapThresholdUs = intervalUs * 2;
	const resolve = stackResolver(profile, true);
	const stackTime = new Map<string, number>();
	let idleUs = 0;
	const add = (key: string, us: number) => stackTime.set(key, (stackTime.get(key) ?? 0) + us);

	for (let i = 0; i < samples.length; i++) {
		// A negative delta means the clock went backwards: no time, not Math.abs.
		const deltaUs = Math.max(0, timeDeltas[i] ?? 0);
		if (deltaUs === 0) continue;
		const leafId = samples[i];
		// A leaf missing from the tree is malformed data, not idle time.
		const frames = leafId === undefined ? undefined : resolve(leafId);
		if (!frames) continue;
		if (frames.length === 0) {
			idleUs += deltaUs;
			continue;
		}
		const key = frames.join(";");
		const isIdleLeaf = frames[frames.length - 1]?.startsWith(IDLE_FRAME) ?? false;
		if (isIdleLeaf || deltaUs <= gapThresholdUs) {
			add(key, deltaUs);
		} else {
			add(key, intervalUs);
			idleUs += deltaUs - intervalUs;
		}
	}
	if (idleUs > 0) add(IDLE_FRAME, idleUs);
	return [...stackTime].map(([stack, us]) => `${stack} ${us}`).join("\n");
}

/** Sample rate in Hz of a CDP profile (Pyroscope uses it to turn counts into CPU time). */
export function calculateSampleRate(profile: CdpProfileDTO): number {
	if (!profile.samples?.length) return 100;
	const durationUs = profile.endTime - profile.startTime;
	if (durationUs <= 0) return 100;
	return Math.round((profile.samples.length / durationUs) * 1_000_000);
}
