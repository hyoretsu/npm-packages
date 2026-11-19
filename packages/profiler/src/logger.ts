import type { ProfilerLoggerDTO } from "./dtos/ProfilerLogger.dto";

const PREFIX = "[@hyoretsu/profiler]";

export type Log = (level: keyof ProfilerLoggerDTO, message: string) => void;

/** Silent unless `debug` is set or a custom logger is supplied. */
export function createLog(debug: boolean, logger?: ProfilerLoggerDTO): Log {
	if (logger) {
		return (level, message) => {
			logger[level]?.(message);
		};
	}
	if (!debug) return () => undefined;
	return (level, message) => {
		const line = `${PREFIX} [${level.toUpperCase()}] ${message}`;
		if (level === "error") console.error(line);
		else if (level === "warn") console.warn(line);
		else console.log(line);
	};
}
