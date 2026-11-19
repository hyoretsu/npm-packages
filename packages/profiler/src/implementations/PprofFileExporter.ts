import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExportResultDTO } from "../dtos/ExportResult.dto";
import type { PprofFileExporterOptionsDTO } from "../dtos/PprofFileExporterOptions.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import { ProfilerConfigError } from "../errors/ProfilerConfigError";
import { ProfileExporter } from "../models/ProfileExporter";
import { encodePprof } from "../pprof";
import { convertToSpeedscope } from "../speedscope";

/** Writes each CPU window to `directory` as `.pb.gz` (pprof), `.cpuprofile` or speedscope JSON. */
export class PprofFileExporter extends ProfileExporter {
	readonly name: string;
	private readonly format: NonNullable<PprofFileExporterOptionsDTO["format"]>;
	private readonly directory: string;
	private sequence = 0;

	constructor(options: PprofFileExporterOptionsDTO) {
		super();
		if (!options.directory) throw new ProfilerConfigError("file exporter directory is required");
		this.format = options.format ?? "pprof";
		if (!["pprof", "cpuprofile", "speedscope"].includes(this.format)) {
			throw new ProfilerConfigError("file exporter format must be pprof, cpuprofile, or speedscope");
		}
		this.directory = options.directory;
		this.name = options.name ?? `file-${this.format}`;
	}

	async export(window: ProfileWindowDTO): Promise<ExportResultDTO | undefined> {
		if (window.type !== "cpu") return undefined;
		await mkdir(this.directory, { recursive: true });
		const stem = `${window.appName.replace(/[^a-zA-Z0-9_.-]/g, "_")}-${window.from}-${this.sequence++}`;
		let data: Uint8Array | string;
		let extension: string;
		if (this.format === "pprof") {
			extension = "pb.gz";
			data = encodePprof(window.profile, {
				durationNanos: String((window.until - window.from) * 1_000_000_000),
				sampleIntervalUs: window.sampleIntervalUs,
				sampleLabels: window.sampleLabels,
				timeNanos: String(window.until * 1_000_000_000),
			});
		} else if (this.format === "cpuprofile") {
			extension = "cpuprofile";
			data = JSON.stringify(window.profile);
		} else {
			extension = "speedscope.json";
			data = JSON.stringify(convertToSpeedscope(window.profile, window.appName));
		}
		await writeFile(join(this.directory, `${stem}.${extension}`), data);
		return {
			bytes: typeof data === "string" ? new TextEncoder().encode(data).byteLength : data.byteLength,
		};
	}
}

/** Creates a `PprofFileExporter`. */
export function pprofFileExporter(options: PprofFileExporterOptionsDTO): ProfileExporter {
	return new PprofFileExporter(options);
}
