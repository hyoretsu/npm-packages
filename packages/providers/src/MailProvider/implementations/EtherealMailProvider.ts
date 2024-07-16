import nodemailer, { type Transporter } from "nodemailer";
import type { SendMailDTO } from "../dtos/SendMail.dto";
import type { MailProvider } from "../models";

export default class EtherealMailProvider implements MailProvider {
	private client!: Transporter;

	constructor() {
		nodemailer.createTestAccount().then(account => {
			const transporter = nodemailer.createTransport({
				host: account.smtp.host,
				port: account.smtp.port,
				secure: account.smtp.secure,
				auth: {
					user: account.user,
					pass: account.pass,
				},
			});

			this.client = transporter;
		});
	}

	public async sendMail({ from, to, subject, body: text }: SendMailDTO): Promise<void> {
		const message = await this.client.sendMail({
			from,
			to,
			subject,
			text,
		});

		console.log("Message sent:", message);
		console.log("Preview URL:", nodemailer.getTestMessageUrl(message));
	}
}
