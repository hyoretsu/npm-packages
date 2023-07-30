export type { SendMailDTO } from "./dtos/SendMail.dto";
import EtherealMailProvider from "./implementations/EtherealMailProvider";
import NodemailerMailProvider from "./implementations/NodemailerMailProvider";
export * from "./models";

export type MailProviderKeys = "ethereal" | "gmail" | "nodemailer" | "sendgrid";
type MailProviders = typeof EtherealMailProvider | typeof NodemailerMailProvider;

export const mailProviders: Record<MailProviderKeys, MailProviders> = {
	ethereal: EtherealMailProvider,
	gmail: NodemailerMailProvider,
	nodemailer: NodemailerMailProvider,
	sendgrid: NodemailerMailProvider,
};
