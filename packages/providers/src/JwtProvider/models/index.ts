export interface IJwtProvider {
	sign(subject: any, expiresIn: number): Promise<string>;
}

export abstract class JwtProvider {
	abstract sign(subject: any, expiresIn: string | number | Date): Promise<string>;
}
