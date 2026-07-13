import type { LazyProvider } from "../lazy";
import type JoseJwtProvider from "./implementations/JoseJwtProvider";
import type JsonWebTokenJwtProvider from "./implementations/JsonWebTokenJwtProvider";

export * from "./models";

type JwtProviders = typeof JoseJwtProvider | typeof JsonWebTokenJwtProvider;
export type JwtProviderKeys = "jose" | "jsonwebtoken";

export enum JwtProvidersEnum {
	JOSE = "jose",
	JSON_WEB_TOKEN = "jsonwebtoken",
}
export const jwtProviders: Record<JwtProviderKeys, LazyProvider<JwtProviders>> = {
	jose: async () => (await import("./implementations/JoseJwtProvider")).default,
	jsonwebtoken: async () => (await import("./implementations/JsonWebTokenJwtProvider")).default,
};
