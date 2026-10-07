import { REDACTED, redact } from "../src";

describe("redact", () => {
  it("masque les clés sensibles, quelle que soit la casse ou le format", () => {
    const out = redact({ Password: "a", access_token: "b", "x-api-key": "c", name: "ok", nested: { clientSecret: "d" } });
    expect(out).toEqual({ Password: REDACTED, access_token: REDACTED, "x-api-key": REDACTED, name: "ok", nested: { clientSecret: REDACTED } });
  });

  it("gère les références circulaires, la profondeur et les tableaux longs", () => {
    const a: Record<string, unknown> = { list: Array.from({ length: 60 }, (_, i) => i) };
    a.self = a;
    const out = redact(a) as { self: unknown; list: unknown[] };
    expect(out.self).toBe("[Circular]");
    expect(out.list).toHaveLength(51);
  });

  it("tronque les chaînes et les valeurs trop volumineuses", () => {
    expect(redact("x".repeat(3000))).toMatch(/\[\+1000 chars\]$/);
    expect(String(redact({ a: "y".repeat(1900), b: "y".repeat(1900), c: "y".repeat(1900), d: "y".repeat(1900), e: "y".repeat(1900), f: "y".repeat(1900) }))).toMatch(/truncated/);
  });

  it("ne mute pas l'objet d'origine", () => {
    const input = { password: "secret" };
    redact(input);
    expect(input.password).toBe("secret");
  });
});
