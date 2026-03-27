export interface SignJwt {
	/** Signature or encryption algorithm. */
	alg?:
		| "HS256"
		| "HS384"
		| "HS512"
		| "PS256"
		| "PS384"
		| "PS512"
		| "RS256"
		| "RS384"
		| "RS512"
		| "ES256"
		| "ES256K"
		| "ES384"
		| "ES512"
		| "EdDSA";
	expiresIn?: string;
	payload?: Record<string, any>;
	subject: string;
}

export interface IJwtProvider {
	sign(data: SignJwt): Promise<string>;
	verify(data: string): Promise<Record<string, any>>;
}

export abstract class JwtProvider implements IJwtProvider {
	abstract sign(data: SignJwt): Promise<string>;
	abstract verify<T = Record<string, any>>(data: string): Promise<T>;
}
