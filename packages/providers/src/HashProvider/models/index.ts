export interface IHashProvider {
	compare(payload: string, hashed: string): Promise<boolean>;
	generate(payload: string, rounds?: number): Promise<string>;
}

export abstract class HashProvider implements IHashProvider {
	abstract compare(payload: string, hashed: string): Promise<boolean>;
	abstract generate(payload: string, rounds?: number): Promise<string>;
}
