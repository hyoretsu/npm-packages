import type { ProfileLabelsDTO } from "./dtos/ProfileLabels.dto";
import type { ProfilerOptionsDTO } from "./dtos/ProfilerOptions.dto";
import type { ResolvedProfilerConfigDTO } from "./dtos/ResolvedProfilerConfig.dto";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";
import { PprofFileExporter } from "./implementations/PprofFileExporter";
import { buildDefaultLabels, resolveAppName, validateLabels } from "./labels";

type Env = Record<string, string | undefined>;

const BLOCKED_HEADERS = new Set([
	"authorization",
	"connection",
	"content-encoding",
	"content-length",
	"content-type",
	"host",
	"transfer-encoding",
]);

function parseBoolean(name: string, value: string | undefined): boolean | undefined {
	if (value === undefined || value === "") return undefined;
	const lower = value.toLowerCase();
	if (value === "1" || lower === "true") return true;
	if (value === "0" || lower === "false") return false;
	throw new ProfilerConfigError(`${name} must be true, false, 1, or 0`);
}

function parseInteger(name: string, value: string | undefined): number | undefined {
	if (value === undefined || value === "") return undefined;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new ProfilerConfigError(`${name} must be a non-negative integer`);
	}
	return parsed;
}

/** Parses `250ms`, `15s`, `1m` or `500us` into milliseconds. */
function parseDurationMs(name: string, value: string | undefined): number | undefined {
	if (value === undefined || value === "") return undefined;
	const match = /^([0-9]+(?:\.[0-9]+)?)(us|ms|s|m)$/.exec(value.trim());
	if (!match) throw new ProfilerConfigError(`${name} must include us, ms, s, or m (for example 15s)`);
	const multiplier = { m: 60_000, ms: 1, s: 1_000, us: 0.001 }[match[2] as "m" | "ms" | "s" | "us"];
	const result = Number(match[1]) * multiplier;
	if (!Number.isFinite(result) || result <= 0)
		throw new ProfilerConfigError(`${name} must be greater than zero`);
	return result;
}

function parseDurationUs(name: string, value: string | undefined): number | undefined {
	const milliseconds = parseDurationMs(name, value);
	return milliseconds === undefined ? undefined : Math.round(milliseconds * 1_000);
}

/** Parses `key=value,key2=value2` (`:` is accepted as a separator too). */
export function parseLabels(value: string | undefined): ProfileLabelsDTO | undefined {
	if (!value?.trim()) return undefined;
	const labels: ProfileLabelsDTO = {};
	for (const rawEntry of value.split(",")) {
		const entry = rawEntry.trim();
		const separator = entry.includes("=") ? entry.indexOf("=") : entry.indexOf(":");
		if (separator <= 0) throw new ProfilerConfigError("PYROSCOPE_LABELS must use key=value pairs");
		Object.assign(
			labels,
			validateLabels({ [entry.slice(0, separator).trim()]: entry.slice(separator + 1).trim() }, true),
		);
	}
	return labels;
}

function compact<T extends object>(value: T): T | undefined {
	const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
	return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
}

/**
 * Reads the environment into options. Explicit `overrides` win; nested option groups are merged
 * key by key so a partial override keeps the other environment-backed values.
 *
 * | Variable | Option |
 * | --- | --- |
 * | `PYROSCOPE_SERVER_ADDRESS` | `pyroscopeUrl` |
 * | `PYROSCOPE_APPLICATION_NAME` | `appName` |
 * | `PYROSCOPE_LABELS` | `labels` |
 * | `PYROSCOPE_PROFILING_INTERVAL` | `sampleIntervalUs` |
 * | `PYROSCOPE_UPLOAD_INTERVAL` | `pushIntervalMs` |
 * | `PYROSCOPE_BASIC_AUTH_USER` / `_PASSWORD` | `basicAuth` |
 * | `PYROSCOPE_TENANT_ID` | `tenantId` |
 * | `PROFILER_*` | see the README table |
 */
export function optionsFromEnv(
	overrides: Partial<ProfilerOptionsDTO> = {},
	env: Env = process.env,
): ProfilerOptionsDTO {
	const profilingMs = parseDurationMs("PYROSCOPE_PROFILING_INTERVAL", env.PYROSCOPE_PROFILING_INTERVAL);
	const user = env.PYROSCOPE_BASIC_AUTH_USER;
	const password = env.PYROSCOPE_BASIC_AUTH_PASSWORD;
	if (Boolean(user) !== Boolean(password)) {
		throw new ProfilerConfigError(
			"PYROSCOPE_BASIC_AUTH_USER and PYROSCOPE_BASIC_AUTH_PASSWORD must be set together",
		);
	}
	const format = env.PROFILER_PYROSCOPE_FORMAT;
	if (format !== undefined && format !== "" && format !== "pprof" && format !== "folded") {
		throw new ProfilerConfigError("PROFILER_PYROSCOPE_FORMAT must be folded or pprof");
	}

	const exporters = [];
	const outputDirectory = env.PROFILER_OUTPUT_DIR;
	if (outputDirectory) {
		const outputFormat = env.PROFILER_OUTPUT_FORMAT || "pprof";
		if (outputFormat !== "pprof" && outputFormat !== "cpuprofile" && outputFormat !== "speedscope") {
			throw new ProfilerConfigError("PROFILER_OUTPUT_FORMAT must be pprof, cpuprofile, or speedscope");
		}
		exporters.push(new PprofFileExporter({ directory: outputDirectory, format: outputFormat }));
	}

	const fromEnv: ProfilerOptionsDTO = {
		adaptiveSampling: compact({
			busyIntervalUs: parseDurationUs(
				"PROFILER_ADAPTIVE_BUSY_INTERVAL",
				env.PROFILER_ADAPTIVE_BUSY_INTERVAL,
			),
			enabled: parseBoolean("PROFILER_ADAPTIVE_ENABLED", env.PROFILER_ADAPTIVE_ENABLED),
			idleIntervalUs: parseDurationUs(
				"PROFILER_ADAPTIVE_IDLE_INTERVAL",
				env.PROFILER_ADAPTIVE_IDLE_INTERVAL,
			),
		}),
		appName: env.PYROSCOPE_APPLICATION_NAME || undefined,
		authToken: env.PROFILER_AUTH_TOKEN || undefined,
		basicAuth: user && password ? { password, username: user } : undefined,
		compress: parseBoolean("PROFILER_COMPRESS", env.PROFILER_COMPRESS),
		debug: parseBoolean("PROFILER_DEBUG", env.PROFILER_DEBUG),
		exporters: exporters.length > 0 ? exporters : undefined,
		exportTimeoutMs: parseDurationMs("PROFILER_EXPORT_TIMEOUT", env.PROFILER_EXPORT_TIMEOUT),
		labels: parseLabels(env.PYROSCOPE_LABELS),
		maxPendingWindows: parseInteger("PROFILER_MAX_PENDING_WINDOWS", env.PROFILER_MAX_PENDING_WINDOWS),
		maxRetries: parseInteger("PROFILER_MAX_RETRIES", env.PROFILER_MAX_RETRIES),
		pushIntervalMs: parseDurationMs("PYROSCOPE_UPLOAD_INTERVAL", env.PYROSCOPE_UPLOAD_INTERVAL),
		pyroscopeFormat: format ? (format as "folded" | "pprof") : undefined,
		pyroscopeUrl: env.PYROSCOPE_SERVER_ADDRESS || undefined,
		sampleIntervalUs: profilingMs === undefined ? undefined : Math.round(profilingMs * 1_000),
		shutdownTimeoutMs: parseDurationMs("PROFILER_SHUTDOWN_TIMEOUT", env.PROFILER_SHUTDOWN_TIMEOUT),
		signalHandlers: parseBoolean("PROFILER_SIGNAL_HANDLERS", env.PROFILER_SIGNAL_HANDLERS),
		sourceMaps: compact({
			cacheSize: parseInteger("PROFILER_SOURCE_MAP_CACHE_SIZE", env.PROFILER_SOURCE_MAP_CACHE_SIZE),
			enabled: parseBoolean("PROFILER_SOURCE_MAPS_ENABLED", env.PROFILER_SOURCE_MAPS_ENABLED),
		}),
		tenantId: env.PYROSCOPE_TENANT_ID || undefined,
		tracing: compact({
			enabled: parseBoolean("PROFILER_TRACING_ENABLED", env.PROFILER_TRACING_ENABLED),
			maxSampleLabelSets: parseInteger(
				"PROFILER_MAX_SAMPLE_LABEL_SETS",
				env.PROFILER_MAX_SAMPLE_LABEL_SETS,
			),
			maxSpanAgeMs: parseDurationMs("PROFILER_MAX_SPAN_AGE", env.PROFILER_MAX_SPAN_AGE),
			maxTrackedSpans: parseInteger("PROFILER_MAX_TRACKED_SPANS", env.PROFILER_MAX_TRACKED_SPANS),
		}),
		wallTime: compact({
			enabled: parseBoolean("PROFILER_WALL_TIME_ENABLED", env.PROFILER_WALL_TIME_ENABLED),
		}),
	};

	const defined = Object.fromEntries(Object.entries(fromEnv).filter(([, value]) => value !== undefined));
	const merged: ProfilerOptionsDTO = { ...defined, ...overrides };
	merged.labels = { ...fromEnv.labels, ...overrides.labels };
	merged.exporters = [...(fromEnv.exporters ?? []), ...(overrides.exporters ?? [])];
	for (const group of ["adaptiveSampling", "sourceMaps", "tracing", "wallTime"] as const) {
		const combined = { ...fromEnv[group], ...overrides[group] };
		(merged as Record<string, unknown>)[group] = Object.keys(combined).length > 0 ? combined : undefined;
	}
	// Authentication is one logical choice: an explicit one replaces the environment-backed alternative.
	if (overrides.authToken !== undefined && overrides.basicAuth === undefined) merged.basicAuth = undefined;
	if (overrides.basicAuth !== undefined && overrides.authToken === undefined) merged.authToken = undefined;
	return merged;
}

/** Whether the options name at least one destination (a URL or an exporter). */
export function hasDestination(options: ProfilerOptionsDTO): boolean {
	return Boolean(options.pyroscopeUrl) || (options.exporters?.length ?? 0) > 0;
}

function requirePositive(name: string, value: number, integer = false): void {
	if (!Number.isFinite(value) || value <= 0) {
		throw new ProfilerConfigError(`${name} must be a finite number greater than zero`);
	}
	if (integer && !Number.isSafeInteger(value)) throw new ProfilerConfigError(`${name} must be an integer`);
}

function validateUrl(value: string): string {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new ProfilerConfigError("pyroscopeUrl must be a valid URL");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new ProfilerConfigError("pyroscopeUrl must use http or https");
	}
	return value.replace(/\/$/, "");
}

function validateHeaders(headers: Record<string, string>): Record<string, string> {
	const validated: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) {
			throw new ProfilerConfigError(`invalid HTTP header name ${JSON.stringify(name)}`);
		}
		if (BLOCKED_HEADERS.has(name.toLowerCase())) {
			throw new ProfilerConfigError(`${name} is managed by the profiler and cannot be overridden`);
		}
		if (typeof value !== "string" || /[\r\n]/.test(value)) {
			throw new ProfilerConfigError(`${name} must be a string without newlines`);
		}
		validated[name] = value;
	}
	return validated;
}

/** Validates options and applies every default. Throws `ProfilerConfigError` with a clear message. */
export function resolveConfig(options: ProfilerOptionsDTO): ResolvedProfilerConfigDTO {
	if (!hasDestination(options))
		throw new ProfilerConfigError("pyroscopeUrl or at least one exporter is required");
	if (options.authToken && options.basicAuth) {
		throw new ProfilerConfigError("authToken and basicAuth are mutually exclusive");
	}
	if (options.basicAuth && (!options.basicAuth.username || !options.basicAuth.password)) {
		throw new ProfilerConfigError("basicAuth requires both username and password");
	}
	if (
		options.pyroscopeFormat &&
		options.pyroscopeFormat !== "folded" &&
		options.pyroscopeFormat !== "pprof"
	) {
		throw new ProfilerConfigError("pyroscopeFormat must be folded or pprof");
	}
	if (options.tenantId && /[\r\n]/.test(options.tenantId)) {
		throw new ProfilerConfigError("tenantId must not contain newlines");
	}
	const labels = validateLabels(options.labels, true, ["span_id", "trace_id"]);

	const sampleIntervalUs = options.sampleIntervalUs ?? 10_000;
	const pushIntervalMs = options.pushIntervalMs ?? 15_000;
	const maxRetries = options.maxRetries ?? 2;
	const maxPendingWindows = options.maxPendingWindows ?? 2;
	const shutdownTimeoutMs = options.shutdownTimeoutMs ?? 10_000;
	const exportTimeoutMs = options.exportTimeoutMs ?? 10_000;
	const cacheSize = options.sourceMaps?.cacheSize ?? 64;
	const busyIntervalUs = options.adaptiveSampling?.busyIntervalUs ?? sampleIntervalUs;
	const idleIntervalUs = options.adaptiveSampling?.idleIntervalUs ?? sampleIntervalUs * 5;
	const busyThreshold = options.adaptiveSampling?.busyThreshold ?? 0.25;
	const maxTrackedSpans = options.tracing?.maxTrackedSpans ?? 10_000;
	const maxSampleLabelSets = options.tracing?.maxSampleLabelSets ?? 2_000;
	const maxSpanAgeMs = options.tracing?.maxSpanAgeMs ?? 300_000;
	requirePositive("sampleIntervalUs", sampleIntervalUs, true);
	requirePositive("pushIntervalMs", pushIntervalMs);
	requirePositive("maxPendingWindows", maxPendingWindows, true);
	requirePositive("shutdownTimeoutMs", shutdownTimeoutMs);
	requirePositive("exportTimeoutMs", exportTimeoutMs);
	requirePositive("sourceMaps.cacheSize", cacheSize, true);
	requirePositive("adaptiveSampling.busyIntervalUs", busyIntervalUs, true);
	requirePositive("adaptiveSampling.idleIntervalUs", idleIntervalUs, true);
	requirePositive("tracing.maxTrackedSpans", maxTrackedSpans, true);
	requirePositive("tracing.maxSampleLabelSets", maxSampleLabelSets, true);
	requirePositive("tracing.maxSpanAgeMs", maxSpanAgeMs);
	if (busyThreshold <= 0 || busyThreshold > 1) {
		throw new ProfilerConfigError("adaptiveSampling.busyThreshold must be greater than 0 and at most 1");
	}
	if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) {
		throw new ProfilerConfigError("maxRetries must be a non-negative integer");
	}

	const appName = resolveAppName(options.appName);
	if (!appName.trim()) throw new ProfilerConfigError("appName must not be empty");

	return {
		adaptiveSampling: {
			busyIntervalUs,
			busyThreshold,
			enabled: options.adaptiveSampling?.enabled ?? false,
			idleIntervalUs,
		},
		appName,
		authToken: options.authToken,
		basicAuth: options.basicAuth,
		compress: options.compress ?? false,
		debug: options.debug ?? false,
		exporters: options.exporters ?? [],
		exportTimeoutMs,
		headers: validateHeaders(options.headers ?? {}),
		labels: { ...buildDefaultLabels(appName), ...labels },
		logger: options.logger,
		maxPendingWindows,
		maxRetries,
		pushIntervalMs,
		pyroscopeFormat: options.pyroscopeFormat ?? "pprof",
		pyroscopeUrl: options.pyroscopeUrl ? validateUrl(options.pyroscopeUrl) : undefined,
		sampleIntervalUs,
		shutdownTimeoutMs,
		signalHandlers: options.signalHandlers ?? true,
		sourceMaps: { cacheSize, enabled: options.sourceMaps?.enabled ?? false },
		tenantId: options.tenantId,
		tracing: {
			enabled: options.tracing?.enabled ?? true,
			maxSampleLabelSets,
			maxSpanAgeMs,
			maxTrackedSpans,
		},
		wallTime: { enabled: options.wallTime?.enabled ?? false },
	};
}
