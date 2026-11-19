export {
	createProfilerSpanProcessor,
	isRootOrServerSpan,
	ProfilerSpanProcessor,
	type SpanTrackingTarget,
} from "../implementations/ProfilerSpanProcessor";
export type { OtelSpanContextLikeDTO, OtelSpanLikeDTO } from "../dtos/OtelSpan.dto";
export type { ProfilerSpanProcessorOptionsDTO } from "../dtos/ProfilerSpanProcessorOptions.dto";
