import type { MonitorEvent } from "../types";

const escapeHtml = (value: unknown): string =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const formatDate = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "medium", timeZone }).format(new Date(iso));

export interface EmailTemplateOptions {
  timeZone?: string;
  /** Lien vers la vue détaillée, ex. `https://app/_monitor/groups/12`. */
  detailUrl?: string;
}

const COLORS = { error: "#d32f2f", warning: "#ed6c02", info: "#0288d1" } as const;

export function buildEventEmailHtml(event: MonitorEvent, { timeZone = "Europe/Paris", detailUrl }: EmailTemplateOptions = {}): string {
  const color = COLORS[event.level];
  const title = event.level === "error" ? "Erreur" : event.level === "warning" ? "Avertissement" : "Information";
  const row = (label: string, value: unknown) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:140px;">${label}</td><td style="padding:4px 0;font-size:13px;color:#111827;word-break:break-word;">${escapeHtml(value)}</td></tr>`;
  const block = (label: string, content: string, dark = false) => `
    <p style="margin:20px 0 6px;font-size:13px;font-weight:bold;color:#374151;">${label}</p>
    <pre style="margin:0;padding:12px;border-radius:6px;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:${dark ? "#1f2937" : "#f9fafb"};color:${dark ? "#e5e7eb" : "#374151"};border:1px solid ${dark ? "#1f2937" : "#e5e7eb"};">${escapeHtml(content)}</pre>`;

  const req = event.request;
  const context = req ? { params: req.params, query: req.query, body: req.body, extra: event.extra } : event.extra ? { extra: event.extra } : undefined;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:${color};padding:20px 24px;font-size:20px;font-weight:bold;color:#fff;">${title} - ${escapeHtml(event.app)} [${escapeHtml(event.environment ?? "n/a")}]</div>
    <div style="padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row("Type", event.type)}
        ${row("Date", formatDate(event.timestamp, timeZone))}
        ${row("Version", event.version)}
        ${row("Utilisateur", event.user?.mail)}
        ${row("Requête", req ? `${req.method} ${req.url}` : undefined)}
        ${row("Route", req?.route)}
        ${row("Statut HTTP", req?.statusCode)}
        ${row("Request ID", req?.requestId)}
        ${row("Navigateur", req?.userAgent)}
        ${row("Empreinte", event.fingerprint)}
      </table>
      ${block("Message", event.message)}
      ${block("Stack trace", event.stack ?? event.message, true)}
      ${context && Object.keys(context).length ? block("Contexte", JSON.stringify(context, null, 2)) : ""}
      ${req?.curl ? block("Reproduire (cURL)", req.curl) : ""}
      ${detailUrl ? `<p style="margin-top:20px;"><a href="${escapeHtml(detailUrl)}" style="color:${color};">Voir le détail</a></p>` : ""}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
      Message généré automatiquement par @naomis/error-handler (${escapeHtml(event.app)}).
    </div>
  </div>
</body></html>`;
}
