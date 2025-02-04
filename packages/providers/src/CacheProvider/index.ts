import { RedisCacheProvider } from "./implementations";
export * from "./models";

type CacheProviders = typeof RedisCacheProvider;
export type CacheProviderKeys = "redis";

export const CacheProviders: Record<CacheProviderKeys, CacheProviders> = {
	redis: RedisCacheProvider,
};
