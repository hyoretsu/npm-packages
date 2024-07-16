import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import nodemailerSendgrid from "nodemailer-sendgrid";
import type { SendMailDTO } from "../dtos/SendMail.dto";
import type { MailProvider } from "../models";

export default class NodemailerMailProvider implements MailProvider {
	private client: Transporter;

	constructor() {
		const transportObject: Record<string, SMTPTransport | SMTPTransport.Options> = {
			gmail: {
				service: "gmail",
				auth: {
					user: process.env.MAIL_USER,
					pass: process.env.MAIL_PASS,
				},
			},
			nodemailer: {
				host: process.env.MAIL_HOST,
				port: Number(process.env.MAIL_PORT),
				secure: true,
				auth: {
					user: process.env.MAIL_USER,
					pass: process.env.MAIL_PASS,
				},
			},
			sendgrid: nodemailerSendgrid({
				apiKey: process.env.SENDGRID_API_KEY as string,
			}),
		};

		this.client = nodemailer.createTransport(transportObject[process.env.MAIL_DRIVER as string]);
	}

	public async sendMail({ body: html, files = [], from, replyTo, subject, to }: SendMailDTO): Promise<void> {
		await this.client.sendMail({
			attachments: files.map(file => ({ content: file.buffer, filename: file.originalname })),
			from,
			html,
			replyTo,
			subject,
			to,
		});
	}
}
