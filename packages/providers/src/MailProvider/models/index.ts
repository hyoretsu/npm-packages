import type { SendMailDTO } from "../dtos/SendMail.dto";

export abstract class MailProvider {
	abstract sendMail(data: SendMailDTO): Promise<void>;
}
