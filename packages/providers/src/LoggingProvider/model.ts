import type { LoggingLevel } from "./types";

export interface LoggingArgs {
	content?: Record<string, any>;
	message?: string;
	severity?: 1 | 2 | 3 | 4;
}

export type ILoggingService = Record<LoggingLevel, (args: LoggingArgs) => void>;

export abstract class LoggingProvider implements ILoggingService {
	abstract debug(args: LoggingArgs): void;
	abstract error(args: LoggingArgs): void;
	abstract info(args: LoggingArgs): void;
	abstract warn(args: LoggingArgs): void;
}
