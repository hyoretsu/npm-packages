import type { LazyProvider } from "../lazy";
import type { OtlpLoggingProvider } from "./implementations/Otlp";
import type { PinoLoggingProvider } from "./implementations/Pino";

export * from "./model";
export * from "./types";

export type LoggingProviderKeys = "otlp" | "pino";
type LoggingProviders = typeof OtlpLoggingProvider | typeof PinoLoggingProvider;

export enum LoggingProvidersEnum {
	OTLP = "otlp",
	PINO = "pino",
}
export const loggingProviders: Record<LoggingProviderKeys, LazyProvider<LoggingProviders>> = {
	otlp: async () => (await import("./implementations/Otlp")).OtlpLoggingProvider,
	pino: async () => (await import("./implementations/Pino")).PinoLoggingProvider,
};
