import pino from "pino";
import type { LokiOptions } from "pino-loki";
import { type LoggingArgs, LoggingProvider } from "../model";
import type { LoggingLevel } from "../types";

export type LoggingArgsArray = [a?: Record<string, any> | string, b?: string];

export class PinoLoggingProvider extends LoggingProvider {
	private transport = pino.transport<LokiOptions>({
		options: {
			host: process.env.LOGGING_URL!,
		},
		target: "pino-loki",
	});
	logger = pino(this.transport);

	private getArgs({ content, message }: LoggingArgs): LoggingArgsArray {
		if (!content && !message) {
			this.error({
				content: {
					reason: "You must provide either the 'message' or 'content' arguments in order to log.",
				},
				message: "Wrong logging arguments",
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
