import { OtlpLoggingProvider, PinoLoggingProvider } from "./implementations";
export * from "./model";
export * from "./types";

export type LoggingProviderKeys = "otlp" | "pino";
type LoggingProviders = typeof OtlpLoggingProvider | typeof PinoLoggingProvider;

export const loggingProviders: Record<LoggingProviderKeys, LoggingProviders> = {
	otlp: OtlpLoggingProvider,
	pino: PinoLoggingProvider,
};
