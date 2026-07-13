export interface UploadFileDTO {
	buffer: Uint8Array;
	contentType: string;
	filename: string;
}

export interface GetUrlOptions {
	expiresIn?: number;
}

export interface IStorageProvider {
	getUrl(filename: string, options?: GetUrlOptions): string;
	uploadFile(data: UploadFileDTO): Promise<void>;
}

export abstract class StorageProvider implements IStorageProvider {
	abstract getUrl(filename: string, options?: GetUrlOptions): string;
	abstract uploadFile(data: UploadFileDTO): Promise<void>;
}
