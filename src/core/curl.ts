const SKIPPED_HEADERS = new Set(["host", "content-length", "connection", "accept-encoding"]);

const quote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export interface CurlInput {
  method: string;
  url: string;
  headers?: Record<string, unknown>;
  body?: unknown;
}

/** Construit une commande cURL à partir de données déjà masquées par `redact`. */
export function buildCurl({ method, url, headers, body }: CurlInput): string {
  const parts = ["curl", "-X", method.toUpperCase(), quote(url)];
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (SKIPPED_HEADERS.has(name.toLowerCase()) || value === undefined) continue;
    parts.push("-H", quote(`${name}: ${Array.isArray(value) ? value.join(", ") : String(value)}`));
  }
  const hasBody = body !== undefined && !(typeof body === "object" && body !== null && Object.keys(body).length === 0);
  if (hasBody) {
    parts.push("--data-raw", quote(typeof body === "string" ? body : JSON.stringify(body)));
  }
  return parts.join(" ");
}
