import type { LazyProvider } from "../lazy";
import type { S3StorageProvider } from "./implementations/s3";

export * from "./model";

export type StorageProviderKeys = "s3";
type StorageProviders = typeof S3StorageProvider;

export enum StorageProvidersEnum {
	S3 = "s3",
}

export const storageProviders: Record<StorageProviderKeys, LazyProvider<StorageProviders>> = {
	s3: async () => (await import("./implementations/s3")).S3StorageProvider,
};
