import BCryptHashProvider from "./implementations/BCryptHashProvider";

export type HashProviderKeys = "bcrypt";
export type HashProviders = typeof BCryptHashProvider;

export const hashProviders: Record<HashProviderKeys, HashProviders> = {
	bcrypt: BCryptHashProvider,
};
