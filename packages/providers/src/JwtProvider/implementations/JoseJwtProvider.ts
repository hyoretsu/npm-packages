import { SignJWT } from "jose";
import type { JwtProvider } from "../models";

export default class JoseJwtProvider implements JwtProvider {
	public async sign(subject: any, expiresIn: number): Promise<string> {
		const jwt = await new SignJWT(subject)
			.setIssuedAt()
			.setExpirationTime(expiresIn)
			.sign(new TextEncoder().encode(process.env.JWT_SECRET));

		return jwt;
	}
}
