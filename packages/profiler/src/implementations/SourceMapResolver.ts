import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import type { CdpCallFrameDTO } from "../dtos/CdpCallFrame.dto";
import type { CdpProfileDTO } from "../dtos/CdpProfile.dto";

interface CachedMap {
	map: TraceMap;
	baseUrl: URL;
}

/** Bounded, failure-tolerant source-map resolver for bundled JavaScript frames. */
export class SourceMapResolver {
	private readonly cacheSize: number;
	private readonly cache = new Map<string, Promise<CachedMap | null>>();

	constructor(cacheSize = 64) {
		this.cacheSize = cacheSize;
	}

	async resolveProfile(profile: CdpProfileDTO): Promise<CdpProfileDTO> {
		const frames = await Promise.all(profile.nodes.map(node => this.resolveFrame(node.callFrame)));
		return {
			...profile,
			nodes: profile.nodes.map((node, index) => ({
				...node,
				callFrame: frames[index] ?? node.callFrame,
			})),
		};
	}

	private async resolveFrame(frame: CdpCallFrameDTO): Promise<CdpCallFrameDTO> {
		if (!frame.url.startsWith("file://") || frame.lineNumber < 0 || frame.columnNumber < 0) {
			return frame;
		}
		const cached = await this.loadMap(frame.url);
		if (!cached) return frame;
		const original = originalPositionFor(cached.map, {
			column: frame.columnNumber,
			line: frame.lineNumber + 1,
		});
		if (original.line === null || original.column === null || !original.source) return frame;
		let source = original.source;
		try {
			source = new URL(source, cached.baseUrl).href;
		} catch {
			// Keep the source-map-provided path when it is not a valid URL.
		}
		return {
			...frame,
			columnNumber: original.column,
			functionName: original.name ?? frame.functionName,
			lineNumber: original.line - 1,
			url: source,
		};
	}

	/** Cached as promises so concurrent frames of one script share a single read and parse. */
	private loadMap(scriptUrl: string): Promise<CachedMap | null> {
		const cached = this.cache.get(scriptUrl);
		if (cached) {
			this.cache.delete(scriptUrl);
			this.cache.set(scriptUrl, cached);
			return cached;
		}
		const loading = this.readMap(scriptUrl);
		this.cache.set(scriptUrl, loading);
		while (this.cache.size > this.cacheSize) {
			const oldest = this.cache.keys().next().value;
			if (oldest === undefined) break;
			this.cache.delete(oldest);
		}
		return loading;
	}

	private async readMap(scriptUrl: string): Promise<CachedMap | null> {
		try {
			const script = await readFile(fileURLToPath(scriptUrl), "utf8");
			const match = /[#@]\s*sourceMappingURL=([^\s*]+)\s*(?:\*\/)?\s*$/.exec(script);
			const reference = match?.[1];
			if (!reference) return null;
			let raw: string;
			let baseUrl = new URL(scriptUrl);
			if (reference.startsWith("data:")) {
				const comma = reference.indexOf(",");
				const payload = reference.slice(comma + 1);
				raw = reference.slice(0, comma).includes(";base64")
					? new TextDecoder().decode(Uint8Array.from(atob(payload), char => char.charCodeAt(0)))
					: decodeURIComponent(payload);
			} else {
				baseUrl = new URL(reference, scriptUrl);
				raw = await readFile(fileURLToPath(baseUrl), "utf8");
			}
			return { baseUrl, map: new TraceMap(raw) };
		} catch {
			return null;
		}
	}
}
