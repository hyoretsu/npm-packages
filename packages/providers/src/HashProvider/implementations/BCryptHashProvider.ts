import { compare, hash } from "bcrypt";
import type { HashProvider } from "../models";

export class BCryptHashProvider implements HashProvider {
	public async compareHash(payload: string, hashed: string): Promise<boolean> {
		return compare(payload, hashed);
	}

	public async generateHash(payload: string, rounds = 8): Promise<string> {
		return hash(payload, rounds);
	}
}
