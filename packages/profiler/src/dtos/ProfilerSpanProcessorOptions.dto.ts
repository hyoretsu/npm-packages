import type { OtelSpanLikeDTO } from "./OtelSpan.dto";
import type { ProfileLabelsDTO } from "./ProfileLabels.dto";

/** Options of `ProfilerSpanProcessor`. */
export interface ProfilerSpanProcessorOptionsDTO {
	/** Extra labels computed from the span at start (and again at end). */
	extraLabels?: (span: OtelSpanLikeDTO) => ProfileLabelsDTO | undefined;
	/** Which spans to track. Default: spans without a parent, and `SERVER` spans. */
	filter?: (span: OtelSpanLikeDTO) => boolean;
	/** Span attribute set to the span id so Grafana can link Tempo to Pyroscope. `false` disables. Default: `pyroscope.profile.id`. */
	profileIdAttribute?: string | false;
	/** Span attribute copied to the `route` label (read at start and again at end). `false` disables. Default: `http.route`. */
	routeAttribute?: string | false;
	/** Label name receiving the route. Default: `route`. */
	routeLabel?: string;
}
