import JoseJwtProvider from "./implementations/JoseJwtProvider";
import JsonWebTokenJwtProvider from "./implementations/JsonWebTokenJwtProvider";
export * from "./models";

type JwtProviders = typeof JoseJwtProvider | typeof JsonWebTokenJwtProvider;
export type JwtProviderKeys = "jose" | "jsonwebtoken";

export const jwtProviders: Record<JwtProviderKeys, JwtProviders> = {
	jose: JoseJwtProvider,
	jsonwebtoken: JsonWebTokenJwtProvider,
};
