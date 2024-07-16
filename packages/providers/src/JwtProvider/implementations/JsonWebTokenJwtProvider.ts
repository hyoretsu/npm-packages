import { sign } from "jsonwebtoken";
import type { JwtProvider } from "../models";

export default class JsonWebTokenJwtProvider implements JwtProvider {
	public async sign(subject: any, expiresIn: number): Promise<string> {
		const jwt = sign({}, process.env.JWT_SECRET!, {
			subject,
			expiresIn,
		});

		return jwt;
	}
}
