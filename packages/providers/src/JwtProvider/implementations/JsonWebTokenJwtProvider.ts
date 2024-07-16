import { sign } from "jsonwebtoken";
import type { JwtProvider, SignJwt } from "../models";

export default class JsonWebTokenJwtProvider implements JwtProvider {
	public async sign({ expiresIn = "24h", payload = {}, subject }: SignJwt): Promise<string> {
		const jwt = sign(payload, process.env.JWT_SECRET!, {
			expiresIn,
			subject,
		});

		return jwt;
	}
}
