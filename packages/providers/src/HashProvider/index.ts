import { BCryptHashProvider, BCryptJSHashProvider } from "./implementations";
import type { HashProvider } from "./models";

export type HashProviderKeys = "bcrypt" | "bcryptjs";

export const hashProviders: Record<HashProviderKeys, typeof HashProvider> = {
	bcrypt: BCryptHashProvider,
	bcryptjs: BCryptJSHashProvider,
};

export * from "./models";
