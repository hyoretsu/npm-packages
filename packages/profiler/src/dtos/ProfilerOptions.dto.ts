import type { ProfileExporter } from "../models/ProfileExporter";
import type { AdaptiveSamplingOptionsDTO } from "./AdaptiveSamplingOptions.dto";
import type { BasicAuthDTO } from "./BasicAuth.dto";
import type { ProfileLabelsDTO } from "./ProfileLabels.dto";
import type { ProfilerLoggerDTO } from "./ProfilerLogger.dto";
import type { PyroscopeFormatDTO } from "./PyroscopeExporterOptions.dto";
import type { SourceMapsOptionsDTO } from "./SourceMapsOptions.dto";
import type { TracingOptionsDTO } from "./TracingOptions.dto";

/** Options of `Profiler`, `createProfiler` and `startProfiling`. Every field is optional. */
export interface ProfilerOptionsDTO {
	adaptiveSampling?: AdaptiveSamplingOptionsDTO;
	/** Application name (Pyroscope `name`). Default: `SERVICE_NAME`, then `npm_package_name`, then `app`. */
	appName?: string;
	authToken?: string;
	basicAuth?: BasicAuthDTO;
	/** Gzip folded Pyroscope bodies. */
	compress?: boolean;
	/** Log diagnostics to the console. Ignored when `logger` is given. Default: false. */
	debug?: boolean;
	/** Per-attempt deadline of the shorthand Pyroscope exporter. Default: 10000. */
	exportTimeoutMs?: number;
	/** Explicit destinations. A `pyroscopeUrl`, when also present, is added first. */
	exporters?: readonly ProfileExporter[];
	/** Extra HTTP headers of the shorthand Pyroscope destination. */
	headers?: Record<string, string>;
	/** Window-level labels (bounded cardinality). Merged over the defaults (hostname, service_name, ...). */
	labels?: ProfileLabelsDTO;
	/** Custom diagnostics sink. */
	logger?: ProfilerLoggerDTO;
	maxPendingWindows?: number;
	maxRetries?: number;
	/** Upload/rotation interval. Default: 15000. */
	pushIntervalMs?: number;
	/** Wire format of the shorthand Pyroscope destination. Default: `pprof`. */
	pyroscopeFormat?: PyroscopeFormatDTO;
	/** Pyroscope server URL. Required unless `exporters` is supplied. */
	pyroscopeUrl?: string;
	/** Sampling interval in microseconds. Default: 10000 (10 ms). */
	sampleIntervalUs?: number;
	shutdownTimeoutMs?: number;
	/** Flush on SIGTERM/SIGINT and re-raise the signal. Default: true. */
	signalHandlers?: boolean;
	sourceMaps?: SourceMapsOptionsDTO;
	tenantId?: string;
	tracing?: TracingOptionsDTO;
	/** Also export time-weighted wall profiles (folded, `app.wall`). Default: false. */
	wallTime?: { enabled?: boolean };
}
