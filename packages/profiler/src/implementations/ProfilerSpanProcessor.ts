import type { OtelSpanLikeDTO } from "../dtos/OtelSpan.dto";
import type { ProfileLabelsDTO } from "../dtos/ProfileLabels.dto";
import type { ProfilerSpanProcessorOptionsDTO } from "../dtos/ProfilerSpanProcessorOptions.dto";
import type { ProfilerHandle } from "../models/ProfilerHandle";

/** The only thing the processor needs from a profiler (`Profiler`, a disabled handle, or a fake). */
export type SpanTrackingTarget = Pick<ProfilerHandle, "trackSpan">;

const SERVER_KIND = 1;

/** Default filter: spans without a parent (roots) and `SERVER` spans (incoming requests). */
export function isRootOrServerSpan(span: OtelSpanLikeDTO): boolean {
	const hasParent = Boolean(span.parentSpanContext?.spanId ?? span.parentSpanId);
	return !hasParent || span.kind === SERVER_KIND;
}

/**
 * Structural OpenTelemetry `SpanProcessor` that binds profiles to traces. It imports nothing from
 * `@opentelemetry/*`: any SDK that calls `onStart(span, parentContext)` / `onEnd(span)` works.
 *
 * For every span passing `filter` it calls `profiler.trackSpan`, adds the `route` label from
 * `http.route` (read at start, and again at end, where HTTP instrumentations usually have set it),
 * and sets the span attribute `pyroscope.profile.id` to the span id, which Grafana's Tempo
 * "trace to profiles" link uses to open the matching Pyroscope span profile.
 */
export class ProfilerSpanProcessor {
	private readonly ends = new WeakMap<object, (finalLabels?: ProfileLabelsDTO) => void>();
	private readonly options: Required<
		Pick<ProfilerSpanProcessorOptionsDTO, "profileIdAttribute" | "routeAttribute" | "routeLabel">
	> &
		ProfilerSpanProcessorOptionsDTO;

	constructor(
		private readonly profiler: SpanTrackingTarget,
		options: ProfilerSpanProcessorOptionsDTO = {},
	) {
		this.options = {
			...options,
			profileIdAttribute: options.profileIdAttribute ?? "pyroscope.profile.id",
			routeAttribute: options.routeAttribute ?? "http.route",
			routeLabel: options.routeLabel ?? "route",
		};
	}

	private labelsFor(span: OtelSpanLikeDTO): ProfileLabelsDTO {
		const labels: ProfileLabelsDTO = {};
		const { routeAttribute, routeLabel } = this.options;
		if (routeAttribute) {
			const route = span.attributes?.[routeAttribute];
			if (typeof route === "string" && route) labels[routeLabel] = route;
		}
		Object.assign(labels, this.options.extraLabels?.(span));
		return labels;
	}

	/** SpanProcessor.onStart. The parent context argument is accepted and ignored. */
	onStart(span: OtelSpanLikeDTO, _parentContext?: unknown): void {
		try {
			if (!(this.options.filter ?? isRootOrServerSpan)(span)) return;
			const { spanId, traceId } = span.spanContext();
			this.ends.set(span, this.profiler.trackSpan({ labels: this.labelsFor(span), spanId, traceId }));
			if (this.options.profileIdAttribute) span.setAttribute?.(this.options.profileIdAttribute, spanId);
		} catch {
			// Telemetry must never break the instrumented application.
		}
	}

	/** SpanProcessor.onEnd: closes the interval, merging the final route label. */
	onEnd(span: OtelSpanLikeDTO): void {
		try {
			const end = this.ends.get(span);
			if (!end) return;
			this.ends.delete(span);
			end(this.labelsFor(span));
		} catch {
			// See onStart.
		}
	}

	/** SpanProcessor.forceFlush: nothing is buffered. */
	async forceFlush(): Promise<void> {}

	/** SpanProcessor.shutdown: the profiler is owned (and stopped) by the caller. */
	async shutdown(): Promise<void> {}
}

/** Creates a `ProfilerSpanProcessor` bound to `profiler`. */
export function createProfilerSpanProcessor(
	profiler: SpanTrackingTarget,
	options: ProfilerSpanProcessorOptionsDTO = {},
): ProfilerSpanProcessor {
	return new ProfilerSpanProcessor(profiler, options);
}
