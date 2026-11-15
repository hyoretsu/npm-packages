import { S3Client } from "bun";
import type { GetUrlOptions, StorageProvider, UploadFileDTO } from "../model";

export class S3StorageProvider implements StorageProvider {
	private readonly client = new S3Client();
	// Bucket names cannot contain `/`, so a folder inside the bucket comes from S3_PREFIX.
	private readonly prefix = process.env.S3_PREFIX?.replace(/^\/+|\/+$/g, "");

	private key(filename: string): string {
		return this.prefix ? `${this.prefix}/${filename}` : filename;
	}

	async deleteFile(filename: string): Promise<void> {
		await this.client.file(this.key(filename)).delete();
	}

	getUrl(filename: string, options: GetUrlOptions = {}): string {
		return this.client.file(this.key(filename)).presign({
			expiresIn: options.expiresIn ?? 3600,
			method: "GET",
		});
	}

	async uploadFile({ buffer, contentType, filename }: UploadFileDTO): Promise<void> {
		await this.client.file(this.key(filename)).write(buffer, {
			type: contentType,
		});
	}
}
