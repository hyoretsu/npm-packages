import { type JwtPayload, type SignOptions, sign, verify } from "jsonwebtoken";
import type { JwtProvider, SignJwt } from "../models";

export default class JsonWebTokenJwtProvider implements JwtProvider {
	public async sign({ expiresIn = "24h", payload = {}, subject }: SignJwt): Promise<string> {
		const jwt = sign(payload, process.env.JWT_SECRET!, {
			expiresIn: (expiresIn as SignOptions["expiresIn"])!,
			subject,
		});

		return jwt;
	}

	public async verify<T = Record<string, any>, JwtData = JwtPayload & T>(jwt: string): Promise<JwtData> {
		const payload = verify(jwt, process.env.JWT_SECRET!);

		return payload as JwtData;
	}
}
