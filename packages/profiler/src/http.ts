import { ExporterError } from "./errors/ExporterError";
import { parseRetryAfter } from "./retry";

interface RequestDeadline {
	cleanup(): void;
	signal: AbortSignal;
	timedOut(): boolean;
}

/** Combine a caller abort with a per-request deadline without requiring `AbortSignal.any()`. */
export function requestDeadline(parent: AbortSignal | undefined, timeoutMs: number): RequestDeadline {
	const controller = new AbortController();
	let deadlineReached = false;
	const abortFromParent = () => controller.abort(parent?.reason);
	if (parent?.aborted) abortFromParent();
	else parent?.addEventListener("abort", abortFromParent, { once: true });
	const timer = setTimeout(() => {
		deadlineReached = true;
		controller.abort(new Error(`request timed out after ${timeoutMs}ms`));
	}, timeoutMs);
	timer.unref?.();
	return {
		cleanup() {
			clearTimeout(timer);
			parent?.removeEventListener("abort", abortFromParent);
		},
		signal: controller.signal,
		timedOut: () => deadlineReached,
	};
}

/** Base64 of a UTF-8 string without relying on `Buffer`. */
export function base64Utf8(value: string): string {
	let binary = "";
	for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
	return btoa(binary);
}

/** Maps a non-2xx response to an `ExporterError` (retry on 408/429/5xx only). */
export async function responseToError(response: Response): Promise<ExporterError> {
	const text = await response.text().catch(() => "(unreadable)");
	const retryable = response.status >= 500 || response.status === 429 || response.status === 408;
	return new ExporterError(`HTTP ${response.status}: ${text}`, {
		retryAfterMs: retryable ? parseRetryAfter(response.headers.get("Retry-After")) : undefined,
		retryable,
		status: response.status,
	});
}

/** Normalizes any failure of an HTTP attempt into an `ExporterError`. */
export function toExporterError(
	error: unknown,
	deadline: RequestDeadline,
	timeoutMs: number,
	signal: AbortSignal | undefined,
): ExporterError {
	if (error instanceof ExporterError) return error;
	if (deadline.timedOut()) return new ExporterError(`export timed out after ${timeoutMs}ms`);
	if (signal?.aborted) return new ExporterError("export aborted", { retryable: false });
	return new ExporterError(error instanceof Error ? error.message : String(error));
}
