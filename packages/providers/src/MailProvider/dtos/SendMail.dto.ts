import "multer";

export interface SendMailDTO {
	body: string;
	files?: Express.Multer.File[];
	from?: string;
	replyTo?: string[];
	subject: string;
	to: string;
}
