export type CacheValueBase = bigint | boolean | number | string | Record<string, any>;
export type CacheValue = CacheValueBase | CacheValueBase[];
export type Iso8601Duration = string;
export type Expiration = number | Iso8601Duration;

export interface GetCache {
	/** Expiration in seconds. */
	expiration?: Expiration;
	key: string;
	/** Special type of `get` operation */
	mode?: "del" | "exp" | "get" | "set";
	newValue?: CacheValue;
}

export interface SetCache {
	/** Duration in seconds or ISO 8601 Duration. */
	expiration?: Expiration;
	key: string;
	value: CacheValue;
}

export interface ICacheProvider {
	delete(key: string): Promise<void>;
	get(data: GetCache): Promise<CacheValue | null>;
	set(data: SetCache): Promise<void>;
}

export abstract class CacheProvider implements ICacheProvider {
	abstract delete(key: string): Promise<void>;
	abstract get<T = CacheValue>(data: GetCache): Promise<T | null>;
	abstract set(data: SetCache): Promise<void>;
}
