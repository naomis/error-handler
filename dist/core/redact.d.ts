export declare const REDACTED = "[REDACTED]";
export interface RedactOptions {
    /** Fragments de noms de clés à masquer (insensible à la casse, sans `-` ni `_`). */
    keys?: string[];
    maxDepth?: number;
    maxStringLength?: number;
    maxArrayLength?: number;
    /** Taille maximale (JSON) d'une valeur racine avant troncature. */
    maxBytes?: number;
}
export declare const DEFAULT_SENSITIVE_KEYS: string[];
export declare function redact(value: unknown, options?: RedactOptions): unknown;
