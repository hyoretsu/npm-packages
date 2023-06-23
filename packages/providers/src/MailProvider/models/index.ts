import { SendMailDTO } from "../dtos/SendMail.dto";

export default abstract class MailProvider {
	abstract sendMail(data: SendMailDTO): Promise<void>;
}
