import { gzipSync } from "node:zlib";
import type { ExportResultDTO } from "../dtos/ExportResult.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import type { PyroscopeExporterOptionsDTO } from "../dtos/PyroscopeExporterOptions.dto";
import { ProfilerConfigError } from "../errors/ProfilerConfigError";
import { base64Utf8, requestDeadline, responseToError, toExporterError } from "../http";
import { encodePyroscopeName } from "../labels";
import { ProfileExporter } from "../models/ProfileExporter";
import { encodePprof } from "../pprof";

function authHeader(options: PyroscopeExporterOptionsDTO): string | undefined {
	if (options.authToken) return `Bearer ${options.authToken}`;
	if (options.basicAuth)
		return `Basic ${base64Utf8(`${options.basicAuth.username}:${options.basicAuth.password}`)}`;
	return undefined;
}

/**
 * Pushes windows to Pyroscope's `/ingest`. `pprof` (default) is used for CPU windows and carries
 * per-sample labels (`span_id`, `trace_id`, `route`); wall windows and `format: "folded"` send
 * folded stacks, which can only carry window-level labels.
 */
export class PyroscopeExporter extends ProfileExporter {
	readonly name: string;
	private readonly options: PyroscopeExporterOptionsDTO;

	constructor(options: PyroscopeExporterOptionsDTO) {
		super();
		if (!options.url) throw new ProfilerConfigError("Pyroscope exporter URL is required");
		if (options.authToken && options.basicAuth) {
			throw new ProfilerConfigError(
				"Pyroscope exporter authToken and basicAuth are mutually exclusive",
			);
		}
		if (
			options.timeoutMs !== undefined &&
			(!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)
		) {
			throw new ProfilerConfigError("Pyroscope exporter timeoutMs must be greater than zero");
		}
		if (options.format !== undefined && options.format !== "pprof" && options.format !== "folded") {
			throw new ProfilerConfigError("Pyroscope exporter format must be pprof or folded");
		}
		this.options = { ...options, url: options.url.replace(/\/$/, "") };
		this.name = options.name ?? "pyroscope";
	}

	async export(window: ProfileWindowDTO, signal?: AbortSignal): Promise<ExportResultDTO> {
		const timeoutMs = this.options.timeoutMs ?? 10_000;
		const deadline = requestDeadline(signal, timeoutMs);
		const usePprof = (this.options.format ?? "pprof") === "pprof" && window.type === "cpu";
		const params = new URLSearchParams({
			format: usePprof ? "pprof" : "folded",
			from: String(window.from),
			name: encodePyroscopeName(window.appName, { ...window.labels }, usePprof ? null : window.type),
			spyName: "nodespy",
			until: String(window.until),
		});
		if (!usePprof) params.set("sampleRate", String(window.sampleRate));

		const headers: Record<string, string> = {
			...this.options.headers,
			"Content-Type": usePprof ? "application/octet-stream" : "text/plain",
		};
		const authorization = authHeader(this.options);
		if (authorization) headers.Authorization = authorization;
		if (this.options.tenantId) headers["X-Scope-OrgID"] = this.options.tenantId;

		let body: string | Uint8Array<ArrayBuffer>;
		if (usePprof) {
			body = encodePprof(window.profile, {
				durationNanos: String((window.until - window.from) * 1_000_000_000),
				sampleIntervalUs: window.sampleIntervalUs,
				sampleLabels: window.sampleLabels,
				timeNanos: String(window.until * 1_000_000_000),
			}) as Uint8Array<ArrayBuffer>;
			headers["Content-Encoding"] = "gzip";
		} else if (this.options.compress) {
			body = new Uint8Array(
				gzipSync(new TextEncoder().encode(window.folded)),
			) as Uint8Array<ArrayBuffer>;
			headers["Content-Encoding"] = "gzip";
		} else {
			body = window.folded;
		}

		try {
			const response = await fetch(`${this.options.url}/ingest?${params.toString()}`, {
				body,
				headers,
				method: "POST",
				signal: deadline.signal,
			});
			if (!response.ok) throw await responseToError(response);
			await response.arrayBuffer();
			return {
				bytes: typeof body === "string" ? new TextEncoder().encode(body).byteLength : body.byteLength,
			};
		} catch (error) {
			throw toExporterError(error, deadline, timeoutMs, signal);
		} finally {
			deadline.cleanup();
		}
	}
}

/** Creates a Pyroscope `/ingest` exporter. */
export function pyroscopeExporter(options: PyroscopeExporterOptionsDTO): ProfileExporter {
	return new PyroscopeExporter(options);
}
