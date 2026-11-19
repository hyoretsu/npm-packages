import { hostname } from "node:os";
import { isMainThread, threadId } from "node:worker_threads";
import type { ProfileLabelsDTO } from "./dtos/ProfileLabels.dto";
import { ProfilerConfigError } from "./errors/ProfilerConfigError";

const LABEL_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Labels managed by the span tracker; users cannot set them through `tag` or options. */
export const RESERVED_LABELS = ["span_id", "trace_id"] as const;

/** Resolve the application name: explicit > `SERVICE_NAME` > `npm_package_name` > `app`. */
export function resolveAppName(appName?: string): string {
	return appName ?? process.env.SERVICE_NAME ?? process.env.npm_package_name ?? "app";
}

/** Detect cloud/platform labels from well-known environment variables. */
export function detectPlatformLabels(): ProfileLabelsDTO {
	const labels: ProfileLabelsDTO = {};
	const env = process.env;
	if (env.FLY_REGION) labels.fly_region = env.FLY_REGION;
	if (env.FLY_APP_NAME) labels.fly_app_name = env.FLY_APP_NAME;
	const awsRegion = env.AWS_REGION ?? env.AWS_DEFAULT_REGION;
	if (awsRegion) labels.aws_region = awsRegion;
	if (env.RAILWAY_REGION) labels.railway_region = env.RAILWAY_REGION;
	if (env.RAILWAY_SERVICE_NAME) labels.railway_service = env.RAILWAY_SERVICE_NAME;
	if (env.POD_NAME) labels.pod_name = env.POD_NAME;
	if (env.K8S_NAMESPACE) labels.k8s_namespace = env.K8S_NAMESPACE;
	return labels;
}

/** Default window labels: hostname, service_name, worker_id, environment, service_version, platform. */
export function buildDefaultLabels(appName: string): ProfileLabelsDTO {
	const labels: ProfileLabelsDTO = { hostname: hostname(), service_name: appName };
	if (!isMainThread) labels.worker_id = String(threadId);
	const environment = process.env.NODE_ENV ?? process.env.BUN_ENV;
	if (environment) labels.environment = environment;
	const version = process.env.SERVICE_VERSION ?? process.env.npm_package_version;
	if (version) labels.service_version = version;
	return Object.assign(labels, detectPlatformLabels());
}

/**
 * Validate and copy labels. `strict` throws a `ProfilerConfigError`; otherwise invalid entries
 * are dropped (used on hot paths that must never throw).
 */
export function validateLabels(
	labels: Record<string, unknown> | undefined,
	strict: boolean,
	reserved: readonly string[] = [],
): ProfileLabelsDTO {
	const clean: ProfileLabelsDTO = {};
	for (const [key, value] of Object.entries(labels ?? {})) {
		const problem = !LABEL_KEY.test(key)
			? `invalid label key ${JSON.stringify(key)}`
			: reserved.includes(key)
				? `label ${key} is reserved`
				: typeof value !== "string" || !value || /[\r\n]/.test(value)
					? `label ${key} must be a non-empty single-line string`
					: undefined;
		if (problem) {
			if (strict) throw new ProfilerConfigError(problem);
			continue;
		}
		clean[key] = value as string;
	}
	return clean;
}

/**
 * Encode labels into Pyroscope's `name` query parameter: `app.cpu{key=value,...}`. Keys are sorted;
 * characters that would break the syntax are replaced with underscores.
 */
export function encodePyroscopeName(
	appName: string,
	labels: ProfileLabelsDTO,
	type: string | null = "cpu",
): string {
	const safeAppName = appName.replace(/[{}=,\s]/g, "_");
	const entries = Object.entries(labels);
	const prefix = type ? `${safeAppName}.${type}` : safeAppName;
	if (entries.length === 0) return prefix;
	entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const labelString = entries
		.map(([key, value]) => `${key.replace(/[{}=,\s]/g, "_")}=${value.replace(/[{}=,]/g, "_")}`)
		.join(",");
	return `${prefix}{${labelString}}`;
}
