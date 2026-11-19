import type { ProfileWindowDTO } from "../dtos/ProfileWindow.dto";
import { ProfilerConfigError } from "../errors/ProfilerConfigError";
import { ProfileExporter } from "../models/ProfileExporter";

/** Forwards every window to a user callback (custom sinks, tests, logging). */
export class CallbackExporter extends ProfileExporter {
	readonly name: string;
	private readonly callback: (window: ProfileWindowDTO, signal?: AbortSignal) => void | Promise<void>;

	constructor(
		name: string,
		callback: (window: ProfileWindowDTO, signal?: AbortSignal) => void | Promise<void>,
	) {
		super();
		if (!name.trim()) throw new ProfilerConfigError("callback exporter name must not be empty");
		this.name = name;
		this.callback = callback;
	}

	async export(window: ProfileWindowDTO, signal?: AbortSignal): Promise<void> {
		await this.callback(window, signal);
	}
}

/** Creates a `CallbackExporter`. */
export function callbackExporter(
	name: string,
	callback: (window: ProfileWindowDTO, signal?: AbortSignal) => void | Promise<void>,
): ProfileExporter {
	return new CallbackExporter(name, callback);
}
