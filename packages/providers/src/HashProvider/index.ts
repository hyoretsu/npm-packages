import { BCryptHashProvider, BCryptJSHashProvider } from "./implementations";
import type { HashProvider } from "./models";

export type HashProviderKeys = "bcrypt" | "bcryptjs";
type HashProviders = typeof BCryptHashProvider | typeof BCryptJSHashProvider;

export const hashProviders: Record<HashProviderKeys, HashProviders> = {
	bcrypt: BCryptHashProvider,
	bcryptjs: BCryptJSHashProvider,
};

export * from "./models";
