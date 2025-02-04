export interface IHashProvider {
	compareHash(payload: string, hashed: string): Promise<boolean>;
	generateHash(payload: string, rounds?: number): Promise<string>;
}

export abstract class HashProvider implements IHashProvider {
	abstract compareHash(payload: string, hashed: string): Promise<boolean>;
	abstract generateHash(payload: string, rounds?: number): Promise<string>;
}
