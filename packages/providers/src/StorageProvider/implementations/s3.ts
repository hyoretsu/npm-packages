import { S3Client } from "bun";
import type { GetUrlOptions, StorageProvider, UploadFileDTO } from "../model";

export class S3StorageProvider implements StorageProvider {
	private readonly client = new S3Client();

	getUrl(filename: string, options: GetUrlOptions = {}): string {
		return this.client.file(filename).presign({
			expiresIn: options.expiresIn ?? 3600,
			method: "GET",
		});
	}

	async uploadFile({ buffer, contentType, filename }: UploadFileDTO): Promise<void> {
		await this.client.file(filename).write(buffer, {
			type: contentType,
		});
	}
}
