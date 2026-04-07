import { type SignOptions, sign, verify } from "jsonwebtoken";
import type { JwtPayload, JwtProvider, SignJwt } from "../models";

export default class JsonWebTokenJwtProvider implements JwtProvider {
	public async sign({ expiresIn = "24h", payload = {}, subject }: SignJwt): Promise<string> {
		const jwt = sign(payload, process.env.JWT_SECRET!, {
			expiresIn: (expiresIn as SignOptions["expiresIn"])!,
			subject,
		});

		return jwt;
	}

	public async verify<T extends object>(jwt: string): Promise<JwtPayload<T>> {
		const payload = verify(jwt, process.env.JWT_SECRET!);

		return payload as JwtPayload<T>;
	}
}
