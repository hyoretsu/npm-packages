import { SendMailDTO } from "../dtos/SendMail.dto";

export interface IMailProvider {
	sendMail(data: SendMailDTO): Promise<void>;
}

export abstract class MailProvider {
	abstract sendMail(data: SendMailDTO): Promise<void>;
}
