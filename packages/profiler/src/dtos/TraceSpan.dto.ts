import type { ProfileLabelsDTO } from "./ProfileLabels.dto";

/** A span whose lifetime should be bound to the profile samples taken while it was active. */
export interface TraceSpanDTO {
	/** Extra labels (for example `route`). Invalid entries are dropped. */
	labels?: ProfileLabelsDTO;
	/** 16 lowercase hex characters (OpenTelemetry span id). */
	spanId: string;
	/** 32 lowercase hex characters (OpenTelemetry trace id). */
	traceId: string;
}
