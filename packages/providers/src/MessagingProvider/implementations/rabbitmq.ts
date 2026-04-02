import { type Channel, type ChannelModel, connect } from "amqplib";
import { MessagingProvider } from "../models";
import type { Message, MessagingPublishOptions, MessagingSubscribeOptions } from "../models";

export class RabbitMQMessagingProvider extends MessagingProvider {
	private static readonly MAX_RETRIES = 5;
	private static readonly RETRY_DELAY_MS = 10000;

	private channel?: Channel;
	private connection?: ChannelModel;

	private async ensureChannel(): Promise<void> {
		if (this.channel && this.connection) {
			return;
		}

		try {
			this.connection = await connect(process.env.RABBITMQ_URL!);
			this.channel = await this.connection.createChannel();
		} catch (error) {
			console.error({
				content: {
					error: error instanceof Error ? error.message : String(error),
					message: "Failed to connect to RabbitMQ",
				},
			});
		}
	}

	public async publish(event: Message, options?: MessagingPublishOptions): Promise<void> {
		await this.ensureChannel();

		if (!this.channel) {
			throw new Error("RabbitMQ channel is not initialized");
		}

		const { topic } = event;
		const { fanout, when } = event.options ?? {};
		const buffer = Buffer.from(JSON.stringify(event));

		const delayedQueue = `delayed-${topic}`;
		const fanoutExchange = `fanout-${topic}`;
		const publishOptions = options?.transportOptions ?? {};

		if (fanout) {
			await this.channel.assertExchange(fanoutExchange, "fanout");
			this.channel.publish(fanoutExchange, "", buffer, publishOptions);
			return;
		}

		try {
			if (when) {
				await this.channel.assertQueue(delayedQueue, {
					arguments: {
						"x-dead-letter-exchange": fanout ? fanoutExchange : "",
						"x-dead-letter-routing-key": fanout ? "" : topic,
					},
					durable: true,
				});

				const now = new Date();
				const delay = Math.max(0, when.getTime() - now.getTime());

				this.channel.sendToQueue(delayedQueue, buffer, {
					expiration: delay,
				});

				return;
			}

			this.channel.sendToQueue(topic, buffer, publishOptions);
		} catch (error: unknown) {
			console.error({
				content: {
					error: error instanceof Error ? error.message : String(error),
					message: "Failed to publish event to RabbitMQ",
				},
			});
		}
	}

	public async subscribe(
		topic: string,
		callback: (message: Message) => Promise<void>,
		{ fanout, prefetch }: MessagingSubscribeOptions,
	): Promise<void> {
		await this.ensureChannel();

		if (!this.channel) {
			throw new Error("RabbitMQ channel is not initialized");
		}

		const prefixedQueue = `back-${topic}`;
		const fanoutExchange = `fanout-${topic}`;
		const assertedQueue = fanout ? prefixedQueue : topic;
		const retryQueue = `${assertedQueue}.retry`;
		const deadLetterQueue = `${assertedQueue}.dlq`;

		try {
			await this.channel.assertQueue(assertedQueue, { durable: true });
			await this.channel.assertQueue(retryQueue, {
				arguments: {
					"x-dead-letter-exchange": "",
					"x-dead-letter-routing-key": assertedQueue,
					"x-message-ttl": RabbitMQMessagingProvider.RETRY_DELAY_MS,
				},
				durable: true,
			});
			await this.channel.assertQueue(deadLetterQueue, { durable: true });

			if (fanout) {
				await this.channel.assertExchange(fanoutExchange, "fanout");
				await this.channel.bindQueue(assertedQueue, fanoutExchange, "");
			}

			if (prefetch) {
				this.channel.prefetch(prefetch);
			}

			this.channel.consume(assertedQueue, async message => {
				if (!message) return;

				try {
					const content = JSON.parse(message.content.toString());

					await callback(content);
					this.channel?.ack(message);
				} catch (error: unknown) {
					const headers = message.properties.headers || {};
					const retryCount = Number(headers["x-retry-count"] || 0);

					if (retryCount < RabbitMQMessagingProvider.MAX_RETRIES) {
						console.error({
							content: {
								error: error instanceof Error ? error.message : String(error),
								message: `[Retry ${retryCount + 1}] Failed to process message`,
							},
						});
						this.channel?.ack(message);
						this.channel?.sendToQueue(retryQueue, message.content, {
							headers: { "x-retry-count": retryCount + 1 },
							persistent: true,
						});
					} else {
						this.channel?.ack(message);
						this.channel?.sendToQueue(deadLetterQueue, message.content, {
							headers: { "x-retry-count": retryCount },
							persistent: true,
						});
						console.error({
							content: {
								message: `Message sent to DLQ after ${RabbitMQMessagingProvider.MAX_RETRIES} retries.`,
							},
						});
					}
				}
			});
		} catch (error: unknown) {
			console.error({
				content: {
					error: error instanceof Error ? error.message : String(error),
					message: "Failed to subscribe to RabbitMQ",
				},
			});
		}
	}
}
