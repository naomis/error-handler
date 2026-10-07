import type { Level, Transport } from "../types";
import { EmailTemplateOptions } from "./emailTemplate";
export interface EmailMessage {
    to: string | string[];
    subject: string;
    html: string;
}
export interface EmailTransportOptions {
    /** À fournir par l'application (ex. `MailService.getInstance().sendMail`). Le package n'impose aucun client SMTP. */
    sendMail: (message: EmailMessage) => Promise<unknown>;
    to: string | string[];
    /** Niveaux notifiés. Défaut : `["error"]`. */
    levels?: Level[];
    /** Délai minimal entre deux e-mails pour une même empreinte. Défaut : 1 h. */
    cooldownMs?: number;
    subjectPrefix?: string;
    template?: EmailTemplateOptions;
    /** Nombre maximal d'empreintes mémorisées pour le délai anti-spam. */
    maxTracked?: number;
}
export declare function emailTransport(options: EmailTransportOptions): Transport;
