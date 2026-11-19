/** Thrown when options or environment variables are invalid. */
export class ProfilerConfigError extends Error {
	constructor(message: string) {
		super(`[@hyoretsu/profiler] Invalid configuration: ${message}`);
		this.name = "ProfilerConfigError";
	}
}
