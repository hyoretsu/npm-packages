export interface IHashProvider {
	compareHash(payload: string, hashed: string): Promise<boolean>;
	generateHash(payload: string): Promise<string>;
}

export abstract class HashProvider {
	abstract compareHash(payload: string, hashed: string): Promise<boolean>;
	abstract generateHash(payload: string): Promise<string>;
}
