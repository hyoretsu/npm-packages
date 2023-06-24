import BCryptHashProvider from "./implementations/BCryptHashProvider";
export * from "./models";

export type HashProviderKeys = "bcrypt";
type HashProviders = typeof BCryptHashProvider;

export const hashProviders: Record<HashProviderKeys, HashProviders> = {
	bcrypt: BCryptHashProvider,
};
