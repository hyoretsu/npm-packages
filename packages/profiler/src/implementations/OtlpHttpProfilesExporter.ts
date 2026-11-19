import { buildTree, isUsableFrame, walkToRoot } from "../cdp";
import type { ExportResultDTO } from "../dtos/ExportResult.dto";
import type { OtlpHttpProfilesExporterOptionsDTO } from "../dtos/OtlpHttpProfilesExporterOptions.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import { ProfilerConfigError } from "../errors/ProfilerConfigError";
import { requestDeadline, responseToError, toExporterError } from "../http";
import { ProfileExporter } from "../models/ProfileExporter";

interface OtlpProfilesRequest {
	dictionary: Record<string, unknown>;
	resourceProfiles: unknown[];
}

function profileEndpoint(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new ProfilerConfigError("OTLP Profiles exporter URL must be a valid URL");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new ProfilerConfigError("OTLP Profiles exporter URL must use http or https");
	}
	const path = url.pathname.replace(/\/$/, "");
	if (!path.endsWith("/v1development/profiles")) {
		url.pathname = `${path}/v1development/profiles`.replace(/^\/\//, "/");
	}
	return url.toString();
}

/**
 * Convert one captured CPU window to the current Alpha OTLP Profiles JSON shape (stack table,
 * dictionary). Wire stability is not promised; per-sample labels are not carried.
 */
export function encodeOtlpProfilesJson(window: ProfileWindowDTO): OtlpProfilesRequest | null {
	if (window.type !== "cpu") return null;
	const profile = window.profile;
	const strings = [""];
	const stringIndices = new Map<string, number>([["", 0]]);
	const stringIndex = (value: string): number => {
		const existing = stringIndices.get(value);
		if (existing !== undefined) return existing;
		strings.push(value);
		stringIndices.set(value, strings.length - 1);
		return strings.length - 1;
	};
	const cpuIndex = stringIndex("cpu");
	const nanosecondsIndex = stringIndex("nanoseconds");
	const tree = buildTree(profile);

	// Index zero is the required zero value of every OTLP Profiles dictionary table.
	const functionTable: Record<string, unknown>[] = [{}];
	const locationTable: Record<string, unknown>[] = [{}];
	const locationIndexByNode = new Map<number, number>();
	for (const node of profile.nodes) {
		if (!isUsableFrame(node.callFrame.functionName, node.callFrame.url)) continue;
		const name = node.callFrame.functionName.trim() || "(anonymous)";
		const functionIndex = functionTable.length;
		functionTable.push({
			filenameStrindex: stringIndex(node.callFrame.url || "<unknown>"),
			nameStrindex: stringIndex(name),
			startLine: String(Math.max(0, node.callFrame.lineNumber + 1)),
			systemNameStrindex: stringIndex(name),
		});
		locationIndexByNode.set(node.id, locationTable.length);
		locationTable.push({
			lines: [
				{
					column: String(Math.max(0, node.callFrame.columnNumber + 1)),
					functionIndex,
					line: String(Math.max(0, node.callFrame.lineNumber + 1)),
				},
			],
		});
	}

	const stackTable: Record<string, unknown>[] = [{}];
	const stackIndices = new Map<string, number>();
	const sampleTotals = new Map<number, number>();
	const periodNanos = Math.max(1, Math.round(window.sampleIntervalUs * 1_000));
	for (const leafId of profile.samples ?? []) {
		const locations: number[] = [];
		walkToRoot(tree, leafId, node => {
			const location = locationIndexByNode.get(node.id);
			if (location !== undefined) locations.push(location);
		});
		if (locations.length === 0) continue;
		const key = locations.join(",");
		let stackIndex = stackIndices.get(key);
		if (stackIndex === undefined) {
			stackIndex = stackTable.length;
			stackIndices.set(key, stackIndex);
			stackTable.push({ locationIndices: locations });
		}
		sampleTotals.set(stackIndex, (sampleTotals.get(stackIndex) ?? 0) + periodNanos);
	}

	const attributes = Object.entries({ "service.name": window.appName, ...window.labels }).map(
		([key, value]) => ({
			key,
			value: { stringValue: value },
		}),
	);
	return {
		dictionary: {
			attributeTable: [{}],
			functionTable,
			linkTable: [{}],
			locationTable,
			mappingTable: [{}],
			stackTable,
			stringTable: strings,
		},
		resourceProfiles: [
			{
				resource: { attributes },
				scopeProfiles: [
					{
						profiles: [
							{
								durationNano: String(Math.max(1, window.until - window.from) * 1_000_000_000),
								period: String(periodNanos),
								periodType: { typeStrindex: cpuIndex, unitStrindex: nanosecondsIndex },
								samples: [...sampleTotals].map(([stackIndex, value]) => ({
									stackIndex,
									values: [String(value)],
								})),
								sampleType: { typeStrindex: cpuIndex, unitStrindex: nanosecondsIndex },
								timeUnixNano: String(window.until * 1_000_000_000),
							},
						],
						scope: { name: "@hyoretsu/profiler" },
					},
				],
			},
		],
	};
}

/** Experimental Alpha OTLP/HTTP Profiles exporter. Wire stability is not promised. */
export class OtlpHttpProfilesExporter extends ProfileExporter {
	readonly name: string;
	private readonly endpoint: string;
	private readonly options: OtlpHttpProfilesExporterOptionsDTO;

	constructor(options: OtlpHttpProfilesExporterOptionsDTO) {
		super();
		this.endpoint = profileEndpoint(options.url);
		if (
			options.timeoutMs !== undefined &&
			(!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)
		) {
			throw new ProfilerConfigError("OTLP Profiles exporter timeoutMs must be greater than zero");
		}
		this.options = options;
		this.name = options.name ?? "otlp-profiles-experimental";
	}

	async export(window: ProfileWindowDTO, signal?: AbortSignal): Promise<ExportResultDTO | undefined> {
		const request = encodeOtlpProfilesJson(window);
		if (!request) return undefined;
		const timeoutMs = this.options.timeoutMs ?? 10_000;
		const deadline = requestDeadline(signal, timeoutMs);
		const body = JSON.stringify(request);
		try {
			const response = await fetch(this.endpoint, {
				body,
				headers: { ...this.options.headers, "Content-Type": "application/json" },
				method: "POST",
				signal: deadline.signal,
			});
			if (!response.ok) throw await responseToError(response);
			await response.arrayBuffer();
			return { bytes: new TextEncoder().encode(body).byteLength };
		} catch (error) {
			throw toExporterError(error, deadline, timeoutMs, signal);
		} finally {
			deadline.cleanup();
		}
	}
}

/** Creates the experimental OTLP/HTTP profiles exporter. */
export function otlpHttpProfilesExporter(options: OtlpHttpProfilesExporterOptionsDTO): ProfileExporter {
	return new OtlpHttpProfilesExporter(options);
}
