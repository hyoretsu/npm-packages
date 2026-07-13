import type { LazyProvider } from "../lazy";
import type { BCryptHashProvider } from "./implementations/BCryptHashProvider";
import type { BCryptJSHashProvider } from "./implementations/BCryptJSHashProvider";

export type HashProviderKeys = "bcrypt" | "bcryptjs";
type HashProviders = typeof BCryptHashProvider | typeof BCryptJSHashProvider;

export enum HashProvidersEnum {
	BCRYPT = "bcrypt",
	BCRYPTJS = "bcryptjs",
}
export const hashProviders: Record<HashProviderKeys, LazyProvider<HashProviders>> = {
	bcrypt: async () => (await import("./implementations/BCryptHashProvider")).BCryptHashProvider,
	bcryptjs: async () => (await import("./implementations/BCryptJSHashProvider")).BCryptJSHashProvider,
};

export * from "./models";
