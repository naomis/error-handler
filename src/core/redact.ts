export const REDACTED = "[REDACTED]";

export interface RedactOptions {
  /** Fragments de noms de clés à masquer (insensible à la casse, sans `-` ni `_`). */
  keys?: string[];
  maxDepth?: number;
  maxStringLength?: number;
  maxArrayLength?: number;
  /** Taille maximale (JSON) d'une valeur racine avant troncature. */
  maxBytes?: number;
}

export const DEFAULT_SENSITIVE_KEYS = [
  "password",
  "passwd",
  "pwd",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "creditcard",
  "cardnumber",
  "cvv",
  "ssn",
];

const DEFAULTS = { maxDepth: 6, maxStringLength: 2000, maxArrayLength: 50, maxBytes: 10_000 };

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export function redact(value: unknown, options: RedactOptions = {}): unknown {
  const keys = (options.keys ?? DEFAULT_SENSITIVE_KEYS).map(normalizeKey);
  const maxDepth = options.maxDepth ?? DEFAULTS.maxDepth;
  const maxString = options.maxStringLength ?? DEFAULTS.maxStringLength;
  const maxArray = options.maxArrayLength ?? DEFAULTS.maxArrayLength;
  const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
  const seen = new WeakSet<object>();

  const isSensitive = (key: string): boolean => {
    const normalized = normalizeKey(key);
    return keys.some(fragment => normalized.includes(fragment));
  };

  const walk = (input: unknown, depth: number): unknown => {
    if (input === null || input === undefined) return input;
    if (typeof input === "string") {
      return input.length > maxString ? `${input.slice(0, maxString)}…[+${input.length - maxString} chars]` : input;
    }
    if (typeof input === "number" || typeof input === "boolean") return input;
    if (typeof input === "bigint") return input.toString();
    if (typeof input === "function" || typeof input === "symbol") return `[${typeof input}]`;
    if (Buffer.isBuffer(input)) return `[Buffer ${input.length} bytes]`;
    if (input instanceof Date) return input.toISOString();
    if (input instanceof Error) return { name: input.name, message: input.message };
    if (typeof input !== "object") return String(input);

    if (seen.has(input)) return "[Circular]";
    if (depth >= maxDepth) return "[Truncated]";
    seen.add(input);

    let result: unknown;
    if (Array.isArray(input)) {
      const items = input.slice(0, maxArray).map(item => walk(item, depth + 1));
      if (input.length > maxArray) items.push(`[+${input.length - maxArray} items]`);
      result = items;
    } else {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
        out[key] = isSensitive(key) ? REDACTED : walk(val, depth + 1);
      }
      result = out;
    }
    seen.delete(input);
    return result;
  };

  const redacted = walk(value, 0);
  if (redacted !== null && typeof redacted === "object") {
    const json = JSON.stringify(redacted);
    if (json.length > maxBytes) return `${json.slice(0, maxBytes)}…[truncated, ${json.length} bytes]`;
  }
  return redacted;
}
