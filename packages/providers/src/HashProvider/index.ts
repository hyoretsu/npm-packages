import { BCryptHashProvider, BCryptJSHashProvider } from "./implementations";

export type HashProviderKeys = "bcrypt" | "bcryptjs";
type HashProviders = typeof BCryptHashProvider | typeof BCryptJSHashProvider;

export enum HashProvidersEnum {
	BCRYPT = "bcrypt",
	BCRYPTJS = "bcryptjs",
}
export const hashProviders: Record<HashProviderKeys, HashProviders> = {
	bcrypt: BCryptHashProvider,
	bcryptjs: BCryptJSHashProvider,
};

export * from "./models";
