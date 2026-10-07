export interface CurlInput {
    method: string;
    url: string;
    headers?: Record<string, unknown>;
    body?: unknown;
}
/** Construit une commande cURL à partir de données déjà masquées par `redact`. */
export declare function buildCurl({ method, url, headers, body }: CurlInput): string;
