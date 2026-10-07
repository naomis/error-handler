import { computeFingerprint, normalizeMessage } from "../src";

describe("fingerprint", () => {
  it("normalise les parties variables du message", () => {
    expect(normalizeMessage('User 42 not found: "abc" 3f2b8c1e-1111-2222-3333-444455556666')).toBe(
      'User <n> not found: "<str>" <uuid>',
    );
  });

  it("regroupe deux erreurs identiques à un identifiant près", () => {
    const make = (id: number) => new Error(`Manager ${id} introuvable`);
    const a = make(1);
    const b = make(2);
    b.stack = a.stack;
    expect(computeFingerprint("requestError", a)).toBe(computeFingerprint("requestError", b));
  });

  it("sépare des types ou des messages différents", () => {
    const e = new Error("boom");
    expect(computeFingerprint("requestError", e)).not.toBe(computeFingerprint("uncaughtException", e));
    expect(computeFingerprint("requestError", e)).not.toBe(computeFingerprint("requestError", new Error("autre")));
  });
});
