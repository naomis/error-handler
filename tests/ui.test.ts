import express from "express";
import { Pool } from "pg";
import request from "supertest";
import { createMonitorRouter, MonitorStore } from "../src";
import { renderUiHtml } from "../src/ui/page";
import { makeEvent } from "./helpers";

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describe("renderUiHtml", () => {
  it("injecte le nonce dans le style et le script, sans innerHTML", () => {
    const html = renderUiHtml("abc123");
    expect(html).toContain('<style nonce="abc123">');
    expect(html).toContain('<script nonce="abc123">');
    expect(html).not.toMatch(/\.innerHTML|insertAdjacentHTML|document\.write/);
  });

  it("le script client est du JavaScript valide", () => {
    const script = /<script nonce="n">([\s\S]*)<\/script>/.exec(renderUiHtml("n"))![1];
    expect(() => new Function(script)).not.toThrow();
  });
});

describeDb("UI et stats", () => {
  const schema = "error_monitor_ui_test";
  let pool: Pool;
  let store: MonitorStore;
  const deny: express.RequestHandler = (_req, res) => void res.status(401).json({ error: "no" });
  const allow: express.RequestHandler = (_req, _res, next) => next();

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    store = new MonitorStore(pool, { schema });
    await store.migrate();
  });
  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE ${schema}.error_group CASCADE`);
  });

  const appWith = (auth: express.RequestHandler, ui?: boolean) => {
    const app = express();
    app.use("/_monitor", createMonitorRouter({ store, auth, ui }));
    return app;
  };

  it("sert la page sans auth, avec une CSP stricte, mais protège l'API", async () => {
    const app = appWith(deny);
    const page = await request(app).get("/_monitor/");
    expect(page.status).toBe(200);
    expect(page.headers["content-type"]).toContain("text/html");
    const csp = page.headers["content-security-policy"];
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain("unsafe-inline");
    const nonce = /nonce-([^']+)'/.exec(csp)![1];
    expect(page.text).toContain(`nonce="${nonce}"`);
    expect((await request(app).get("/_monitor/ui")).status).toBe(200);

    expect((await request(app).get("/_monitor/stats")).status).toBe(401);
    expect((await request(app).get("/_monitor/groups")).status).toBe(401);
    expect(page.text).not.toContain("jane@example.com");
  });

  it("génère un nonce différent à chaque requête", async () => {
    const app = appWith(allow);
    const a = await request(app).get("/_monitor/");
    const b = await request(app).get("/_monitor/");
    expect(a.headers["content-security-policy"]).not.toBe(b.headers["content-security-policy"]);
  });

  it("ui: false désactive la page", async () => {
    expect((await request(appWith(allow, false)).get("/_monitor/")).status).toBe(404);
  });

  it("calcule les statistiques sur la fenêtre, avec les jours vides", async () => {
    await store.save(makeEvent({ fingerprint: "A", level: "error" }));
    await store.save(makeEvent({ fingerprint: "A", level: "error" }));
    await store.save(makeEvent({ fingerprint: "B", level: "warning", message: "warn" }));
    const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
    await store.save(makeEvent({ fingerprint: "C", timestamp: old }));
    const { groupId } = await store.save(makeEvent({ fingerprint: "D", level: "warning" }));
    await store.setStatus(groupId, "resolved");

    const stats = await store.stats(7);
    expect(stats.days).toBe(7);
    expect(stats.daily).toHaveLength(7);
    expect(stats.occurrences).toEqual({ error: 2, warning: 2, info: 0, total: 4 });
    expect(stats.groups).toMatchObject({ openError: 2, openWarning: 1, resolved: 1 });
    expect(stats.daily[6]).toMatchObject({ error: 2, warning: 2 });
    expect(stats.top[0]).toMatchObject({ count: 2, message: "boom" });
    expect(stats.apps).toEqual(["test-app"]);
    expect(stats.environments).toEqual(["test"]);
    expect((await store.stats(500)).days).toBe(90);
  });

  it("recherche par texte sans interpréter % et _ comme jokers", async () => {
    await store.save(makeEvent({ fingerprint: "A", message: "Manager introuvable" }));
    await store.save(makeEvent({ fingerprint: "B", message: "100% échec" }));
    expect((await store.listGroups({ q: "manager" })).total).toBe(1);
    expect((await store.listGroups({ q: "%" })).items.map(g => g.message)).toEqual(["100% échec"]);
    expect((await store.listGroups({ q: "_" })).total).toBe(0);

    const res = await request(appWith(allow)).get("/_monitor/groups?q=introuvable");
    expect(res.body.total).toBe(1);
    expect((await request(appWith(allow)).get("/_monitor/stats?days=3")).body.days).toBe(3);
  });
});
