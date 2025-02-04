import { Redis } from "ioredis";
import { CacheProvider, type CacheValue, type Expiration, type GetCache, type SetCache } from "../models";
import { parse, toSeconds } from "iso8601-duration";

export class RedisCacheProvider extends CacheProvider {
	private client: Redis = new Redis(process.env.CACHE_URL!);

	public async delete(key: string): Promise<void> {
		await this.client.del(key);
	}

	public async get({ expiration, key, mode = "get", newValue }: GetCache): Promise<CacheValue | null> {
		let value: string | null;

		switch (mode) {
			case "del":
				value = await this.client.getdel(key);
				break;
			case "exp":
				value = await this.client.getex(key, "EX", this.parseExpiration(expiration!));
				break;
			case "get":
				value = await this.client.get(key);
				break;
			case "set":
				value = await this.client.getset(key, this.serialize(newValue!));
				break;
			default:
				throw new Error(`RedisCacheProvider.get() error - Invalid mode: ${mode}`);
		}

		return value ? JSON.parse(value) : null;
	}

	private parseExpiration(duration: Expiration): number {
		if (typeof duration === "string") {
			return toSeconds(parse(duration));
		}

		return duration;
	}

	private serialize(value: CacheValue): string {
		if (typeof value === "bigint") {
			value = Number(value);
		}

		return JSON.stringify(value);
	}

	public async set({ expiration = 0, key, value }: SetCache): Promise<void> {
		await this.client.setex(key, this.parseExpiration(expiration), this.serialize(value));
	}
}
