import type { ProfilerStatsDTO } from "./dtos/ProfilerStats.dto";

type StatsSource = ProfilerStatsDTO | { stats(): ProfilerStatsDTO };

function metricLabel(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

/** Render profiler health in the Prometheus text exposition format (`profiler_*` metrics). */
export function renderPrometheusMetrics(source: StatsSource): string {
	const stats: ProfilerStatsDTO =
		"stats" in source && typeof source.stats === "function"
			? source.stats()
			: (source as ProfilerStatsDTO);
	const lines: string[] = [];
	const metric = (name: string, type: "counter" | "gauge", help: string, value: number) =>
		lines.push(
			`# HELP profiler_${name} ${help}`,
			`# TYPE profiler_${name} ${type}`,
			`profiler_${name} ${value}`,
		);

	metric("running", "gauge", "Whether the capture loop is active.", stats.running ? 1 : 0);
	metric("captured_windows_total", "counter", "Completed CPU capture windows.", stats.capturedWindows);
	metric("captured_samples_total", "counter", "CDP samples captured.", stats.capturedSamples);
	metric("capture_failures_total", "counter", "Failed inspector captures.", stats.captureFailures);
	metric("empty_windows_total", "counter", "Windows with no usable CPU samples.", stats.emptyWindows);
	metric(
		"capture_gap_seconds",
		"gauge",
		"Most recent stop-to-start sampling gap.",
		(stats.lastCaptureGapMs ?? 0) / 1_000,
	);
	metric(
		"capture_gap_max_seconds",
		"gauge",
		"Largest observed sampling gap.",
		stats.maxCaptureGapMs / 1_000,
	);
	metric(
		"conversion_duration_seconds",
		"gauge",
		"Most recent profile conversion duration.",
		(stats.lastConversionDurationMs ?? 0) / 1_000,
	);
	metric(
		"sample_interval_microseconds",
		"gauge",
		"Current sampling interval.",
		stats.currentSampleIntervalUs,
	);
	metric(
		"sample_interval_changes_total",
		"counter",
		"Adaptive sampling interval changes.",
		stats.samplingIntervalChanges,
	);
	metric(
		"tracked_spans_active",
		"gauge",
		"Currently open tracked spans/tags.",
		stats.tracing.activeIntervals,
	);
	metric(
		"tracked_spans_retained",
		"gauge",
		"Retained span intervals (open and closed).",
		stats.tracing.retainedIntervals,
	);
	metric(
		"tracked_spans_evicted_total",
		"counter",
		"Intervals evicted by the retention cap.",
		stats.tracing.evictedIntervals,
	);
	metric(
		"tracked_spans_orphaned_total",
		"counter",
		"Open intervals force-closed because end() was never called.",
		stats.tracing.orphanedIntervals,
	);
	metric(
		"tracked_spans_invalid_total",
		"counter",
		"Spans rejected for malformed trace/span ids.",
		stats.tracing.invalidSpans,
	);
	metric(
		"attributed_samples_total",
		"counter",
		"Samples labelled with span/tag labels.",
		stats.tracing.attributedSamples,
	);
	metric(
		"unattributed_samples_total",
		"counter",
		"Samples with no active span or tag.",
		stats.tracing.unattributedSamples,
	);
	metric(
		"ambiguous_samples_total",
		"counter",
		"Samples with several overlapping spans.",
		stats.tracing.ambiguousSamples,
	);
	metric(
		"cardinality_limited_samples_total",
		"counter",
		"Samples that lost span ids to the label-set cap.",
		stats.tracing.cardinalityLimitedSamples,
	);

	const exporterMetrics: [string, keyof ProfilerStatsDTO["exporters"][string], "counter" | "gauge"][] = [
		["exported_profiles_total", "exportedProfiles", "counter"],
		["export_failures_total", "failedProfiles", "counter"],
		["export_retries_total", "retries", "counter"],
		["export_dropped_total", "droppedProfiles", "counter"],
		["export_queue_depth", "queueDepth", "gauge"],
		["exported_bytes_total", "exportedBytes", "counter"],
	];
	for (const [name, field, type] of exporterMetrics) {
		lines.push(`# TYPE profiler_${name} ${type}`);
		for (const [exporterName, exporter] of Object.entries(stats.exporters)) {
			lines.push(
				`profiler_${name}{exporter="${metricLabel(exporterName)}"} ${Number(exporter[field])}`,
			);
		}
	}
	lines.push("# TYPE profiler_export_in_flight gauge");
	lines.push("# TYPE profiler_export_last_success_unixtime gauge");
	lines.push("# TYPE profiler_export_duration_seconds gauge");
	for (const [name, exporter] of Object.entries(stats.exporters)) {
		const label = `exporter="${metricLabel(name)}"`;
		lines.push(`profiler_export_in_flight{${label}} ${exporter.inFlight ? 1 : 0}`);
		lines.push(
			`profiler_export_last_success_unixtime{${label}} ${(exporter.lastSuccessAt ?? 0) / 1_000}`,
		);
		lines.push(
			`profiler_export_duration_seconds{${label}} ${(exporter.lastExportDurationMs ?? 0) / 1_000}`,
		);
	}
	for (const [name, value] of Object.entries({
		external_bytes: stats.memory.externalBytes,
		heap_total_bytes: stats.memory.heapTotalBytes,
		heap_used_bytes: stats.memory.heapUsedBytes,
		jsc_extra_memory_size_bytes: stats.memory.jscExtraMemorySizeBytes,
		jsc_heap_capacity_bytes: stats.memory.jscHeapCapacityBytes,
		jsc_heap_size_bytes: stats.memory.jscHeapSizeBytes,
		rss_bytes: stats.memory.rssBytes,
	})) {
		if (value === undefined) continue;
		lines.push(`# TYPE profiler_${name} gauge`, `profiler_${name} ${value}`);
	}
	return `${lines.join("\n")}\n`;
}
