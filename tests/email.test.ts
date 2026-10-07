import { buildEventEmailHtml, emailTransport } from "../src";
import { makeEvent } from "./helpers";

describe("emailTransport", () => {
  afterEach(() => jest.useRealTimers());

  it("n'envoie que les niveaux configurés (error par défaut)", async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const t = emailTransport({ sendMail, to: "ops@x.com" });
    await t.send(makeEvent({ level: "warning" }));
    expect(sendMail).not.toHaveBeenCalled();
    await t.send(makeEvent({ level: "error" }));
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "ops@x.com", subject: "[Erreur - test-app] boom" });
  });

  it("limite la fréquence par empreinte", async () => {
    jest.useFakeTimers();
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const t = emailTransport({ sendMail, to: "ops@x.com", cooldownMs: 1000 });
    await t.send(makeEvent({ fingerprint: "A" }));
    await t.send(makeEvent({ fingerprint: "A" }));
    await t.send(makeEvent({ fingerprint: "B" }));
    expect(sendMail).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1001);
    await t.send(makeEvent({ fingerprint: "A" }));
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("autorise un nouvel essai si l'envoi échoue", async () => {
    const sendMail = jest.fn().mockRejectedValueOnce(new Error("smtp")).mockResolvedValue(undefined);
    const t = emailTransport({ sendMail, to: "ops@x.com" });
    await expect(t.send(makeEvent())).rejects.toThrow("smtp");
    await t.send(makeEvent());
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("échappe le HTML et inclut le cURL", () => {
    const html = buildEventEmailHtml(makeEvent({ message: "<script>alert(1)</script>" }), { detailUrl: "https://x/y" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("curl -X GET");
    expect(html).toContain("https://x/y");
  });
});
