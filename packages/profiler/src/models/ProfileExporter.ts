import type { ExportResultDTO } from "../dtos/ExportResult.dto";
import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";

/**
 * A destination that receives completed windows. Calls are serialized per exporter, retried on
 * failure, and subject to a bounded queue. Plain objects with the same shape are accepted too.
 */
export abstract class ProfileExporter {
	/** Performs the export. Throw `ExporterError({ retryable: false })` to skip retries. */
	abstract export(
		window: ProfileWindowDTO,
		signal?: AbortSignal,
	): Promise<ExportResultDTO | undefined | undefined>;

	/** Stable identifier used in stats and metrics. Must be unique per profiler. */
	abstract readonly name: string;

	/** Called once while the profiler stops, after the queue drained. */
	shutdown?(): Promise<void>;
}
