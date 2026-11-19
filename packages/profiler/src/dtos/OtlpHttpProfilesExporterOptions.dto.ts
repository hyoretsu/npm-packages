/** Options of the experimental OTLP/HTTP profiles exporter. */
export interface OtlpHttpProfilesExporterOptionsDTO {
	headers?: Record<string, string>;
	name?: string;
	/** Abort one HTTP attempt after this duration. Default: 10000. */
	timeoutMs?: number;
	/** Collector base URL or the full `/v1development/profiles` endpoint. */
	url: string;
}
