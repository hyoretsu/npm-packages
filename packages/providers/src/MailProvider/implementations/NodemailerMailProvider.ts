import nodemailer, { Transporter } from "nodemailer";

import { SendMailDTO } from "../dtos/SendMail.dto";
import IMailProvider from "../models";

export default class NodemailerMailProvider implements IMailProvider {
	private client: Transporter;

	constructor() {
		const transportObject: Record<string, any> = {
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
		};

		this.client = nodemailer.createTransport(transportObject[process.env.MAIL_PROVIDER as string]);
	}

	public async sendMail({ from, to, subject, body: text }: SendMailDTO): Promise<void> {
		await this.client.sendMail({
			from,
			to,
			subject,
			text,
		});
	}
}
