import type { LazyProvider } from "../lazy";
import type { KafkaMessagingProvider } from "./implementations/kafka";
import type { RabbitMQMessagingProvider } from "./implementations/rabbitmq";

export * from "./models";

export type MessagingProviderKeys = "kafka" | "rabbitmq";
type MessagingProviders = typeof KafkaMessagingProvider | typeof RabbitMQMessagingProvider;

export enum MessagingProvidersEnum {
	KAFKA = "kafka",
	RABBITMQ = "rabbitmq",
}
export const messagingProviders: Record<MessagingProviderKeys, LazyProvider<MessagingProviders>> = {
	kafka: async () => (await import("./implementations/kafka")).KafkaMessagingProvider,
	rabbitmq: async () => (await import("./implementations/rabbitmq")).RabbitMQMessagingProvider,
};
