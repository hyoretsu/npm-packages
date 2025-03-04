import { SeverityNumber, type Logger } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { Resource } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { LoggingProvider, type LoggingArgs } from "../model";
import type { LoggingLevel } from "../types";

export interface OtlpLoggingServiceArgs {
	/**
	 * Specific part of the project that this service belongs to.
	 *
	 * @example 'Backend'
	 */
	component: string;
	container?: {
		id: string;
		image: {
			id: string;
			name: string;
			tags: string;
		};
		name: string;
	};
	/** Unique ID for each replica of this service. */
	instanceId?: string;
	/** Name of the project that this service belongs to. */
	project: string;
	/**
	 * Must follow SemVer.
	 *
	 * @example '1.0.0'
	 */
	version?: string;
}

export class OtlpLoggingProvider extends LoggingProvider {
	private readonly logger: Logger;

	constructor({
		component,
		container,
		instanceId = process.env.INSTANCE_ID!,
		project,
		version = "1.0.0",
	}: OtlpLoggingServiceArgs) {
		super();

		const loggerProvider = new LoggerProvider({
			resource: new Resource({
				...(container && {
					"container.id": container.id,
					"container.image.id": container.image.id,
					"container.image.name": container.image.name,
					"container.image.tags": container.image.tags,
					"container.name": container.name,
				}),
				"service.instance.id": instanceId,
				"service.name": component,
				"service.namespace": project,
				"service.version": version,
			}),
		});
		loggerProvider.addLogRecordProcessor(
			new BatchLogRecordProcessor(
				new OTLPLogExporter({
					compression: CompressionAlgorithm.GZIP,
					concurrencyLimit: 10,
					url: process.env.LOGGING_URL!,
				}),
			),
		);

		this.logger = loggerProvider.getLogger("default");
	}

	private log(level: LoggingLevel, { content, message, severity }: LoggingArgs): void {
		if (!content && !message) {
			throw new Error(
				`Wrong logging arguments, You must provide either the 'message' or 'content' arguments in order to log.`,
			);
		}

		this.logger.emit({
			body: `${content}\n\n${message}`,
			timestamp: new Date(),
			// @ts-expect-error: dynamic key
			severityNumber: SeverityNumber[`${level.toUpperCase()}${severity === 1 ? "" : severity}`],
		});
	}

	debug({ content: body, severity = 1, ...args }: LoggingArgs): void {
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
