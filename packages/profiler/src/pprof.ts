import { gunzipSync, gzipSync } from "node:zlib";
import { buildTree, isUsableFrame, walkToRoot } from "./cdp";
import type { CdpProfileDTO } from "./dtos/CdpProfile.dto";
import type { DecodedPprofDTO } from "./dtos/DecodedPprof.dto";
import type { PprofEncodeOptionsDTO } from "./dtos/PprofEncodeOptions.dto";
import { decodeUtf8, packedValues, ProtoWriter, readFields } from "./protobuf";

function toBigInt(value: string | number): bigint {
	return typeof value === "string" ? BigInt(value) : BigInt(Math.round(value));
}

/**
 * Encode a CDP CPU profile as a `profile.proto` (pprof) payload, gzip-compressed by default.
 *
 * Samples sharing a stack and label set are aggregated into one pprof `Sample`. Per-sample labels
 * (`options.sampleLabels`) become pprof `Sample.label` entries (string table references), which
 * Pyroscope turns into queryable series labels such as `span_id` and `route`.
 */
export function encodePprof(profile: CdpProfileDTO, options: PprofEncodeOptionsDTO = {}): Uint8Array {
	const sampleIntervalUs = options.sampleIntervalUs ?? 10_000;
	const periodNanos = Math.max(1, Math.round(sampleIntervalUs * 1_000));
	const strings = [""];
	const stringIds = new Map<string, number>([["", 0]]);
	const stringId = (value: string): number => {
		const existing = stringIds.get(value);
		if (existing !== undefined) return existing;
		strings.push(value);
		stringIds.set(value, strings.length - 1);
		return strings.length - 1;
	};
	const samplesType = stringId("samples");
	const countUnit = stringId("count");
	const cpuType = stringId("cpu");
	const nanosecondsUnit = stringId("nanoseconds");

	const tree = buildTree(profile);
	const functionIds = new Map<string, number>();
	const functions: Array<{ file: number; id: number; name: number; startLine: number }> = [];
	const locationByNode = new Map<number, number>();
	const locations: Array<{ column: number; functionId: number; id: number; line: number }> = [];
	for (const node of profile.nodes) {
		const { functionName, url, lineNumber, columnNumber } = node.callFrame;
		if (!isUsableFrame(functionName, url)) continue;
		const name = functionName.trim() || "(anonymous)";
		const startLine = Math.max(0, lineNumber + 1);
		const key = `${name}\u0000${url}\u0000${startLine}`;
		let functionId = functionIds.get(key);
		if (functionId === undefined) {
			functionId = functions.length + 1;
			functionIds.set(key, functionId);
			functions.push({
				file: stringId(url || "<unknown>"),
				id: functionId,
				name: stringId(name),
				startLine,
			});
		}
		const id = locations.length + 1;
		locationByNode.set(node.id, id);
		locations.push({ column: Math.max(0, columnNumber + 1), functionId, id, line: startLine });
	}

	const labelSets = options.sampleLabels?.sets ?? [];
	const labelIndices = options.sampleLabels?.indices;
	const aggregated = new Map<string, { count: number; labelIndex: number; stack: number[] }>();
	const stackByLeaf = new Map<number, number[]>();
	for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
		const leafId = profile.samples[i] as number;
		let stack = stackByLeaf.get(leafId);
		if (!stack) {
			stack = [];
			walkToRoot(tree, leafId, node => {
				const location = locationByNode.get(node.id);
				if (location !== undefined) (stack as number[]).push(location);
			});
			stackByLeaf.set(leafId, stack);
		}
		if (stack.length === 0) continue;
		const labelIndex = labelIndices?.[i] ?? -1;
		const key = `${leafId}:${labelIndex}`;
		const entry = aggregated.get(key);
		if (entry) entry.count++;
		else aggregated.set(key, { count: 1, labelIndex, stack });
	}

	const encodedLabels = labelSets.map(set =>
		Object.entries(set).map(([key, value]) => ({ key: stringId(key), value: stringId(value) })),
	);
	const durationNanos = toBigInt(
		options.durationNanos ?? Math.max(0, profile.endTime - profile.startTime) * 1_000,
	);
	const timeNanos = toBigInt(options.timeNanos ?? Date.now() * 1_000_000);

	const writer = new ProtoWriter();
	const valueType = (field: number, type: number, unit: number) =>
		writer.message(field, child => {
			child.uint(1, type);
			child.uint(2, unit);
		});
	valueType(1, samplesType, countUnit);
	valueType(1, cpuType, nanosecondsUnit);
	for (const { count, labelIndex, stack } of aggregated.values()) {
		writer.message(2, child => {
			child.packed(1, stack);
			child.packed(2, [count, count * periodNanos]);
			for (const label of encodedLabels[labelIndex] ?? []) {
				child.message(3, labelWriter => {
					labelWriter.uint(1, label.key);
					labelWriter.uint(2, label.value);
				});
			}
		});
	}
	for (const location of locations) {
		writer.message(4, child => {
			child.uint(1, location.id);
			child.message(4, line => {
				line.uint(1, location.functionId);
				line.uint(2, location.line);
				line.uint(3, location.column);
			});
		});
	}
	for (const fn of functions) {
		writer.message(5, child => {
			child.uint(1, fn.id);
			child.uint(2, fn.name);
			child.uint(3, fn.name);
			child.uint(4, fn.file);
			child.uint(5, fn.startLine);
		});
	}
	for (const value of strings) writer.string(6, value);
	writer.uint(9, timeNanos);
	writer.uint(10, durationNanos);
	valueType(11, cpuType, nanosecondsUnit);
	writer.uint(12, periodNanos);
	writer.uint(14, cpuType);
	const raw = writer.finish();
	return options.compress === false ? raw : gzipSync(raw);
}

/** Decode a pprof payload (gzipped or raw) produced by `encodePprof` or any compliant encoder. */
export function decodePprof(data: Uint8Array): DecodedPprofDTO {
	const raw = data[0] === 0x1f && data[1] === 0x8b ? new Uint8Array(gunzipSync(data)) : data;
	const fields = readFields(raw);
	const submessages = (field: number) =>
		fields
			.filter(entry => entry.field === field && entry.bytes)
			.map(entry => readFields(entry.bytes as Uint8Array));
	const varint = (list: ReturnType<typeof readFields>, field: number) =>
		list.find(entry => entry.field === field)?.varint ?? 0n;

	const stringTable = fields
		.filter(entry => entry.field === 6)
		.map(entry => decodeUtf8(entry.bytes as Uint8Array));
	const str = (index: bigint | number) => stringTable[Number(index)] ?? "";
	const valueTypeOf = (list: ReturnType<typeof readFields>) => ({
		type: str(varint(list, 1)),
		unit: str(varint(list, 2)),
	});

	const functions = submessages(5).map(entry => ({
		filename: str(varint(entry, 4)),
		id: Number(varint(entry, 1)),
		name: str(varint(entry, 2)),
		startLine: Number(varint(entry, 5)),
		systemName: str(varint(entry, 3)),
	}));
	const functionNames = new Map(functions.map(fn => [fn.id, fn.name]));
	const locations = submessages(4).map(entry => ({
		id: Number(varint(entry, 1)),
		lines: entry
			.filter(item => item.field === 4 && item.bytes)
			.map(item => {
				const line = readFields(item.bytes as Uint8Array);
				return {
					column: Number(varint(line, 3)),
					functionId: Number(varint(line, 1)),
					line: Number(varint(line, 2)),
				};
			}),
	}));
	const locationNames = new Map(
		locations.map(location => [
			location.id,
			location.lines.map(line => functionNames.get(line.functionId) ?? ""),
		]),
	);

	const samples = submessages(2).map(entry => {
		const locationIds = packedValues(entry, 1);
		const labels: Record<string, string> = {};
		for (const item of entry.filter(candidate => candidate.field === 3 && candidate.bytes)) {
			const label = readFields(item.bytes as Uint8Array);
			const key = str(varint(label, 1));
			const value = varint(label, 2);
			if (key && value !== 0n) labels[key] = str(value);
		}
		return {
			labels,
			locationIds,
			stack: locationIds.flatMap(id => locationNames.get(id) ?? []),
			values: packedValues(entry, 2),
		};
	});

	const periodTypeFields = submessages(11)[0];
	return {
		durationNanos: String(varint(fields, 10)),
		functions,
		locations,
		period: String(varint(fields, 12)),
		periodType: periodTypeFields ? valueTypeOf(periodTypeFields) : undefined,
		samples,
		sampleTypes: submessages(1).map(valueTypeOf),
		stringTable,
		timeNanos: String(varint(fields, 9)),
	};
}
