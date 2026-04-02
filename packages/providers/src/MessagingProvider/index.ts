import { KafkaMessagingProvider, RabbitMQMessagingProvider } from "./implementations";

export * from "./models";

export type MessagingProviderKeys = "kafka" | "rabbitmq";
type MessagingProviders = typeof KafkaMessagingProvider | typeof RabbitMQMessagingProvider;

export enum MessagingProvidersEnum {
	KAFKA = "kafka",
	RABBITMQ = "rabbitmq",
}
export const messagingProviders: Record<MessagingProviderKeys, MessagingProviders> = {
	kafka: KafkaMessagingProvider,
	rabbitmq: RabbitMQMessagingProvider,
};
