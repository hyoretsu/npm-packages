import JoseJwtProvider from "./implementations/JoseJwtProvider";
import JsonWebTokenJwtProvider from "./implementations/JsonWebTokenJwtProvider";
import type { JwtProvider } from "./models";

export type { JwtProvider };
export type JwtProviderKeys = "jose" | "jsonwebtoken";

export const jwtProviders: Record<JwtProviderKeys, typeof JwtProvider> = {
	jose: JoseJwtProvider,
	jsonwebtoken: JsonWebTokenJwtProvider,
};
