import type { Level, MonitorEvent, Transport } from "../types";
import { buildEventEmailHtml, EmailTemplateOptions } from "./emailTemplate";

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

export function emailTransport(options: EmailTransportOptions): Transport {
  const { levels = ["error"], cooldownMs = 3_600_000, maxTracked = 1000 } = options;
  const lastSent = new Map<string, number>();

  return {
    name: "email",
    async send(event: MonitorEvent) {
      if (!levels.includes(event.level)) return;

      const key = `${event.app}|${event.environment ?? ""}|${event.fingerprint}`;
      const now = Date.now();
      const previous = lastSent.get(key);
      if (previous !== undefined && now - previous < cooldownMs) return;

      lastSent.delete(key);
      lastSent.set(key, now);
      if (lastSent.size > maxTracked) lastSent.delete(lastSent.keys().next().value as string);

      const prefix = options.subjectPrefix ?? `[${event.level === "error" ? "Erreur" : "Warning"} - ${event.app}]`;
      try {
        await options.sendMail({
          to: options.to,
          subject: `${prefix} ${event.message}`.slice(0, 200),
          html: buildEventEmailHtml(event, options.template),
        });
      } catch (error) {
        lastSent.delete(key); // permettre un nouvel essai
        throw error;
      }
    },
  };
}
