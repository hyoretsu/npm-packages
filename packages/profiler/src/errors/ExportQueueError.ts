/** Reserved for export queue failures. */
export class ExportQueueError extends Error {
	constructor(message: string) {
		super(`[@hyoretsu/profiler] ${message}`);
		this.name = "ExportQueueError";
	}
}
