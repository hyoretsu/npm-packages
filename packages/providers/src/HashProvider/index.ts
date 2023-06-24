import BCryptHashProvider from "./implementations/BCryptHashProvider";
export { HashProvider } from "./models";

export type HashProviderKeys = "bcrypt";
type HashProviders = typeof BCryptHashProvider;

export const hashProviders: Record<HashProviderKeys, HashProviders> = {
	bcrypt: BCryptHashProvider,
};
