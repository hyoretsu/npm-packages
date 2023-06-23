import EtherealMailProvider from "./implementations/EtherealMailProvider";
import NodemailerMailProvider from "./implementations/NodemailerMailProvider";
export type { SendMailDTO } from "./dtos/SendMail.dto";

export type MailProviderKeys = "ethereal" | "gmail" | "nodemailer";
export type MailProviders = typeof EtherealMailProvider | typeof NodemailerMailProvider;

export const mailProviders: Record<MailProviderKeys, MailProviders> = {
	ethereal: EtherealMailProvider,
	gmail: NodemailerMailProvider,
	nodemailer: NodemailerMailProvider,
};
