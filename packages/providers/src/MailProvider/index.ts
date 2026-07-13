export type { SendMailDTO } from "./dtos/SendMail.dto";

import type { LazyProvider } from "../lazy";
import type EtherealMailProvider from "./implementations/EtherealMailProvider";
import type NodemailerMailProvider from "./implementations/NodemailerMailProvider";

export * from "./models";

export type MailProviderKeys = "ethereal" | "gmail" | "nodemailer" | "sendgrid";
type MailProviders = typeof EtherealMailProvider | typeof NodemailerMailProvider;

export enum MailProvidersEnum {
	ETHEREAL = "ethereal",
	GMAIL = "gmail",
	NODEMAILER = "nodemailer",
	SENDGRID = "sendgrid",
}

const etherealProvider: LazyProvider<typeof EtherealMailProvider> = async () =>
	(await import("./implementations/EtherealMailProvider")).default;
const nodemailerProvider: LazyProvider<typeof NodemailerMailProvider> = async () =>
	(await import("./implementations/NodemailerMailProvider")).default;

export const mailProviders: Record<MailProviderKeys, LazyProvider<MailProviders>> = {
	ethereal: etherealProvider,
	gmail: nodemailerProvider,
	nodemailer: nodemailerProvider,
	sendgrid: nodemailerProvider,
};
