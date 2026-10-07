"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCurl = buildCurl;
const SKIPPED_HEADERS = new Set(["host", "content-length", "connection", "accept-encoding"]);
const quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;
/** Construit une commande cURL à partir de données déjà masquées par `redact`. */
function buildCurl({ method, url, headers, body }) {
    const parts = ["curl", "-X", method.toUpperCase(), quote(url)];
    for (const [name, value] of Object.entries(headers ?? {})) {
        if (SKIPPED_HEADERS.has(name.toLowerCase()) || value === undefined)
            continue;
        parts.push("-H", quote(`${name}: ${Array.isArray(value) ? value.join(", ") : String(value)}`));
    }
    const hasBody = body !== undefined && !(typeof body === "object" && body !== null && Object.keys(body).length === 0);
    if (hasBody) {
        parts.push("--data-raw", quote(typeof body === "string" ? body : JSON.stringify(body)));
    }
    return parts.join(" ");
}
//# sourceMappingURL=curl.js.map