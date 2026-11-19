import type { ProfileExporter } from "../models/ProfileExporter";
import type { BasicAuthDTO } from "./BasicAuth.dto";
import type { ProfileLabelsDTO } from "./ProfileLabels.dto";
import type { ProfilerLoggerDTO } from "./ProfilerLogger.dto";
import type { PyroscopeFormatDTO } from "./PyroscopeExporterOptions.dto";

/** Fully validated configuration with every default applied. */
export interface ResolvedProfilerConfigDTO {
	adaptiveSampling: {
		busyIntervalUs: number;
		busyThreshold: number;
		enabled: boolean;
		idleIntervalUs: number;
	};
	appName: string;
	authToken: string | undefined;
	basicAuth: BasicAuthDTO | undefined;
	compress: boolean;
	debug: boolean;
	exporters: readonly ProfileExporter[];
	exportTimeoutMs: number;
	headers: Record<string, string>;
	labels: ProfileLabelsDTO;
	logger: ProfilerLoggerDTO | undefined;
	maxPendingWindows: number;
	maxRetries: number;
	pushIntervalMs: number;
	pyroscopeFormat: PyroscopeFormatDTO;
	pyroscopeUrl: string | undefined;
	sampleIntervalUs: number;
	shutdownTimeoutMs: number;
	signalHandlers: boolean;
	sourceMaps: { cacheSize: number; enabled: boolean };
	tenantId: string | undefined;
	tracing: { enabled: boolean; maxSampleLabelSets: number; maxSpanAgeMs: number; maxTrackedSpans: number };
	wallTime: { enabled: boolean };
}
