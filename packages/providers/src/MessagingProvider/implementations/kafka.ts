import { randomUUID } from "node:crypto";
import {
	Kafka,
	type Consumer,
	type EachMessagePayload,
	type KafkaConfig,
	type Message as KafkaMessage,
	type Producer,
} from "kafkajs";
import { MessagingProvider } from "../models";
import type {
	Message as MessagingMessage,
	MessagingPublishOptions,
	MessagingSubscribeOptions,
} from "../models";

export interface KafkaMessagingProviderConfig extends Omit<KafkaConfig, "clientId" | "brokers"> {
	clientId: string;
	brokers: string[];
	groupId?: string;
}

export class KafkaMessagingProvider extends MessagingProvider {
	private readonly kafka: Kafka;
	private readonly baseGroupId: string;

	private producer?: Producer;
	private producerReady = false;
	private readonly subscriptions = new Map<string, Promise<void>>();

	public constructor(config: KafkaMessagingProviderConfig) {
		super();
		this.kafka = new Kafka(config);
		this.baseGroupId = config.groupId ?? `${config.clientId}-messaging`;
	}

	private getProducer(): Producer {
		this.producer ??= this.kafka.producer();
		return this.producer;
	}

	private async ensureProducer(): Promise<Producer> {
		const producer = this.getProducer();

		if (!this.producerReady) {
			await producer.connect();
			this.producerReady = true;
		}

		return producer;
	}

	private toKafkaHeaders(headers?: Record<string, unknown>): Record<string, string> {
		const kafkaHeaders: Record<string, string> = {};

		for (const [key, value] of Object.entries(headers ?? {})) {
			if (value === undefined || value === null) {
				continue;
			}

			kafkaHeaders[key] = typeof value === "string" ? value : JSON.stringify(value);
		}

		return kafkaHeaders;
	}

	private parseMessage(rawMessage: string, topic: string): MessagingMessage {
		const parsed = JSON.parse(rawMessage) as Partial<MessagingMessage>;

		if (!parsed || typeof parsed !== "object") {
			throw new Error(`Invalid message shape for topic ${topic}`);
		}

		const normalized: MessagingMessage = {
			data: (parsed.data ?? {}) as MessagingMessage["data"],
			topic: parsed.topic ?? topic,
		};

		if (parsed.options) {
			normalized.options = parsed.options;
		}

		return normalized;
	}

	private async ensureSubscribed(
		topic: string,
		callback: (message: MessagingMessage) => Promise<void>,
		fanout?: boolean,
	): Promise<void> {
		const subscriptionKey = `${topic}:${fanout ? "fanout" : "shared"}`;

		if (this.subscriptions.has(subscriptionKey)) {
			await this.subscriptions.get(subscriptionKey);
			return;
		}

		const subscription = this.createSubscription(topic, callback, fanout);
		this.subscriptions.set(subscriptionKey, subscription);

		try {
			await subscription;
		} catch (error) {
			this.subscriptions.delete(subscriptionKey);
			throw error;
		}
	}

	private async createSubscription(
		topic: string,
		callback: (message: MessagingMessage) => Promise<void>,
		fanout?: boolean,
	): Promise<void> {
		const consumer: Consumer = this.kafka.consumer({
			groupId: fanout ? `${this.baseGroupId}.${topic}.${randomUUID()}` : `${this.baseGroupId}.${topic}`,
		});

		await consumer.connect();
		await consumer.subscribe({ fromBeginning: false, topic });
		await consumer.run({
			eachMessage: async ({ message }: EachMessagePayload) => {
				try {
					const content = this.parseMessage(message.value?.toString() ?? "{}", topic);
					await callback(content);
				} catch (error: unknown) {
					console.error({
						content: {
							error: error instanceof Error ? error.message : String(error),
							message: `Failed to process Kafka message from ${topic}`,
						},
					});
				}
			},
		});
	}

	public async publish(message: MessagingMessage, options?: MessagingPublishOptions): Promise<void> {
		const producer = await this.ensureProducer();
		const { topic } = message;
		const headers = this.toKafkaHeaders(options?.headers);
		const when = message.options?.when;

		if (when) {
			headers.scheduledAt = when.toISOString();
		}

		const kafkaMessage: KafkaMessage = {
			headers,
			key: topic,
			value: JSON.stringify(message),
		};

		if (when) {
			kafkaMessage.timestamp = String(when.getTime());
		}

		await producer.send({
			messages: [kafkaMessage],
			topic,
		});
	}

	public async subscribe(
		topic: string,
		callback: (message: MessagingMessage) => Promise<void>,
		options?: MessagingSubscribeOptions,
	): Promise<void> {
		const { fanout, prefetch } = options ?? {};
		void prefetch;

		await this.ensureSubscribed(topic, callback, fanout);
	}
}
