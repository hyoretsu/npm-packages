/** Structural subset of an OpenTelemetry span context. No `@opentelemetry/*` import is needed. */
export interface OtelSpanContextLikeDTO {
	spanId: string;
	traceId: string;
}

/**
 * Structural subset of an OpenTelemetry `Span`/`ReadableSpan`. Covers SDK 1.x (`parentSpanId`)
 * and 2.x (`parentSpanContext`). `kind` follows `SpanKind` (1 = SERVER).
 */
export interface OtelSpanLikeDTO {
	attributes?: Record<string, unknown>;
	kind?: number;
	name?: string;
	parentSpanContext?: { spanId?: string } | undefined;
	parentSpanId?: string | undefined;
	setAttribute?: (key: string, value: string) => unknown;
	spanContext: () => OtelSpanContextLikeDTO;
}
