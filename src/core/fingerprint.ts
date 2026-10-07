import { createHash } from "crypto";

const FRAME_WITH_FN = /^\s*at\s+(.+?)\s+\((.+?):\d+:\d+\)\s*$/;
const FRAME_NO_FN = /^\s*at\s+(.+?):\d+:\d+\s*$/;

/** Retire les parties variables (ids, nombres, valeurs entre quotes) pour regrouper les erreurs identiques. */
export function normalizeMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/(["'`])(?:(?!\1).)*\1/g, "$1<str>$1")
    .replace(/\d+/g, "<n>");
}

/** Première frame appartenant au code applicatif (hors node_modules et node:internal), sans ligne/colonne. */
export function topAppFrame(stack?: string): string {
  if (!stack) return "";
  for (const line of stack.split("\n").slice(1)) {
    if (line.includes("node_modules") || line.includes("node:")) continue;
    const withFn = FRAME_WITH_FN.exec(line);
    if (withFn) return `${withFn[1]}@${basename(withFn[2])}`;
    const noFn = FRAME_NO_FN.exec(line);
    if (noFn) return `<anonymous>@${basename(noFn[1])}`;
  }
  return "";
}

const basename = (path: string): string => path.split(/[\\/]/).pop() ?? path;

export function computeFingerprint(type: string, error: Error): string {
  const parts = [type, error.name, normalizeMessage(error.message), topAppFrame(error.stack)];
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
