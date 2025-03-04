import pino from "pino";
import type { LokiOptions } from "pino-loki";
import { LoggingProvider, type LoggingArgs } from "../model";
import type { LoggingLevel } from "../types";

export type LoggingArgsArray = [a?: Record<string, any> | string, b?: string];

export class PinoLoggingProvider extends LoggingProvider {
	private transport = pino.transport<LokiOptions>({
		target: "pino-loki",
		options: {
			host: process.env.LOGGING_URL!,
		},
	});
	logger = pino(this.transport);

	private getArgs({ content, message }: LoggingArgs): LoggingArgsArray {
		if (!content && !message) {
			this.error({
				message: "Wrong logging arguments",
				content: {
					reason: "You must provide either the 'message' or 'content' arguments in order to log.",
				},
			});
		}

		const args: LoggingArgsArray = [];

		if (content) args.push(content);
		if (message) args.push(message);

		return args;
	}

	private log(level: LoggingLevel, args: LoggingArgs): void {
		this.logger[level](...this.getArgs(args));
	}

	debug(args: LoggingArgs): void {
		this.log("debug", args);
	}

	error(args: LoggingArgs): void {
		this.log("error", args);
	}

	info(args: LoggingArgs): void {
		this.log("info", args);
	}

	warn(args: LoggingArgs): void {
		this.log("warn", args);
	}
}
