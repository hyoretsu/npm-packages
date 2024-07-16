import { SignJWT } from "jose";
import type { JwtProvider, SignJwt } from "../models";

export default class JoseJwtProvider implements JwtProvider {
	public async sign({ alg = "HS256", expiresIn = "24h", payload = {}, subject }: SignJwt): Promise<string> {
		const jwt = await new SignJWT(payload)
			.setProtectedHeader({ alg })
			.setSubject(subject)
			.setIssuedAt()
			.setExpirationTime(expiresIn)
			.sign(new TextEncoder().encode(process.env.JWT_SECRET));

		return jwt;
	}
}
