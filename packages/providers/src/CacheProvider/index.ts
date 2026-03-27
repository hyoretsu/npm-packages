import { RedisCacheProvider } from "./implementations";

export * from "./models";

type CacheProviders = typeof RedisCacheProvider;
export type CacheProviderKeys = "redis";

export enum CacheProvidersEnum {
	REDIS = "redis",
}
export const cacheProviders: Record<CacheProviderKeys, CacheProviders> = {
	redis: RedisCacheProvider,
};
