import { sign, verify, type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { JwtProvider, SignJwt, VerifyJwt } from "../models";

export default class JsonWebTokenJwtProvider implements JwtProvider {
	public async sign({ expiresIn = "24h", payload = {}, subject }: SignJwt): Promise<string> {
		const jwt = sign(payload, process.env.JWT_SECRET!, {
			expiresIn: expiresIn as SignOptions["expiresIn"],
			subject,
		});

		return jwt;
	}

	public async verify({ jwt }: VerifyJwt): Promise<Record<string, any>> {
		const payload = verify(jwt, process.env.JWT_SECRET!) as JwtPayload;

		return payload;
	}
}
