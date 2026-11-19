import type { BasicAuthDTO } from "./BasicAuth.dto";

/** Wire format of a Pyroscope push. */
export type PyroscopeFormatDTO = "folded" | "pprof";

/** Options of the Pyroscope `/ingest` exporter. */
export interface PyroscopeExporterOptionsDTO {
	authToken?: string;
	basicAuth?: BasicAuthDTO;
	/** Gzip folded bodies. Off by default because legacy `/ingest` may silently discard them. */
	compress?: boolean;
	/** `pprof` (default) carries per-sample labels; wall-time windows are always folded. */
	format?: PyroscopeFormatDTO;
	headers?: Record<string, string>;
	name?: string;
	tenantId?: string;
	/** Abort one HTTP attempt after this duration. Default: 10000. */
	timeoutMs?: number;
	url: string;
}
