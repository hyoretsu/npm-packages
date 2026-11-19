import type { ExporterStatsDTO } from "./ExporterStats.dto";
import type { ProfilerMemoryStatsDTO } from "./ProfilerMemoryStats.dto";
import type { TracingStatsDTO } from "./TracingStats.dto";

/** Snapshot returned by `profiler.stats()`. */
export interface ProfilerStatsDTO {
	capturedSamples: number;
	capturedWindows: number;
	captureFailures: number;
	currentSampleIntervalUs: number;
	emptyWindows: number;
	exporters: Record<string, ExporterStatsDTO>;
	failedWindows: number;
	lastCaptureGapMs: number | null;
	lastConversionDurationMs: number | null;
	lastError: string | null;
	lastPushAt: number | null;
	maxCaptureGapMs: number;
	memory: ProfilerMemoryStatsDTO;
	/** Aggregate exporter success count. */
	pushedWindows: number;
	running: boolean;
	samplingIntervalChanges: number;
	streams: string[];
	tracing: TracingStatsDTO;
}
