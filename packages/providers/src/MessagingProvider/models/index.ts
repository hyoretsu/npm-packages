export interface MessagingPublishOptions {
	headers?: Record<string, unknown>;
	persistent?: boolean;
	transportOptions?: unknown;
}

export interface MessagingSubscribeOptions {
	fanout?: boolean;
	prefetch?: number;
}

export interface Message<Payload extends object = Record<string, unknown>> {
	topic: string;
	data: Payload;
	options?: {
		fanout?: boolean;
		when?: Date;
	};
}

export abstract class MessagingProvider {
	public abstract publish(message: Message, options?: MessagingPublishOptions): Promise<void>;
	public abstract subscribe(
		topic: string,
		callback: (message: Message) => Promise<void>,
		options?: MessagingSubscribeOptions,
	): Promise<void>;
}
