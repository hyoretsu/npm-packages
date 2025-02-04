import { compare, hash } from "bcryptjs";
import type { HashProvider } from "../models";

export class BCryptJSHashProvider implements HashProvider {
	public async compareHash(payload: string, hashed: string): Promise<boolean> {
		return compare(payload, hashed);
	}

	public async generateHash(payload: string, rounds = 8): Promise<string> {
		return hash(payload, rounds);
	}
}
