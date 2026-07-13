import type { LazyProvider } from "../lazy";
import type { RedisCacheProvider } from "./implementations/RedisCacheProvider";

export * from "./models";

type CacheProviders = typeof RedisCacheProvider;
export type CacheProviderKeys = "redis";

export enum CacheProvidersEnum {
	REDIS = "redis",
}
export const cacheProviders: Record<CacheProviderKeys, LazyProvider<CacheProviders>> = {
	redis: async () => (await import("./implementations/RedisCacheProvider")).RedisCacheProvider,
};
