/**
 * Thrown when a second sampler is started in the same process. Bun supports only one inspector
 * CPU sampler per process; the same guard is applied on Node for consistent behavior.
 */
export class ProfilerConcurrencyError extends Error {
	constructor(message: string) {
		super(`[@hyoretsu/profiler] ${message}`);
		this.name = "ProfilerConcurrencyError";
	}
}
