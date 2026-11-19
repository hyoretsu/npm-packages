/** Error raised by an exporter. `retryable: false` skips the retry loop (for example HTTP 4xx). */
export class ExporterError extends Error {
	readonly retryAfterMs?: number;
	readonly retryable: boolean;
	readonly status?: number;

	constructor(
		message: string,
		options: { retryAfterMs?: number; retryable?: boolean; status?: number } = {},
	) {
		super(message);
		this.name = "ExporterError";
		this.retryable = options.retryable ?? true;
		this.status = options.status;
		this.retryAfterMs = options.retryAfterMs;
	}
}
