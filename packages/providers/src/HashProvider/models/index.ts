export abstract class HashProvider {
	abstract compareHash(payload: string, hashed: string): Promise<boolean>;
	abstract generateHash(payload: string): Promise<string>;
}
