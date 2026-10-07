import { Pool } from "pg";
import express from "express";
import request from "supertest";
import { createMonitorRouter, dbTransport, MonitorStore } from "../src";
import { makeEvent } from "./helpers";

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb("MonitorStore (Postgres)", () => {
  const schema = "error_monitor_test";
  let pool: Pool;
  let store: MonitorStore;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    store = new MonitorStore(pool, { schema });
    await store.migrate();
    await store.migrate(); // idempotent
  });
  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pool.end();
  });
  beforeEach(async () => {
    await pool.query(`TRUNCATE ${schema}.error_group CASCADE`);
  });

  it("rejette un nom de schema dangereux", () => {
    expect(() => new MonitorStore(pool, { schema: 'x"; DROP TABLE a;--' })).toThrow(/invalide/);
  });

  it("regroupe par empreinte et compte les occurrences", async () => {
    const first = await store.save(makeEvent({ fingerprint: "A" }));
    const second = await store.save(makeEvent({ fingerprint: "A", level: "warning" }));
    const other = await store.save(makeEvent({ fingerprint: "B" }));

    expect(first).toMatchObject({ isNew: true, reopened: false });
    expect(second).toMatchObject({ isNew: false, reopened: false, groupId: first.groupId });
    expect(other.isNew).toBe(true);

    const { items, total } = await store.listGroups();
    expect(total).toBe(2);
    expect(items.find(g => g.fingerprint === "A")).toMatchObject({ count: 2, level: "error", status: "open" });
  });

  it("sépare les groupes par app et environnement", async () => {
    await store.save(makeEvent({ fingerprint: "A", environment: "prod" }));
    await store.save(makeEvent({ fingerprint: "A", environment: "dev" }));
    expect((await store.listGroups()).total).toBe(2);
    expect((await store.listGroups({ environment: "prod" })).total).toBe(1);
  });

  it("rouvre un groupe résolu qui se reproduit, mais pas un groupe ignoré", async () => {
    const { groupId } = await store.save(makeEvent({ fingerprint: "A" }));
    await store.setStatus(groupId, "resolved");
    const again = await store.save(makeEvent({ fingerprint: "A" }));
    expect(again.reopened).toBe(true);
    expect((await store.getGroup(groupId))!.group.status).toBe("open");

    await store.setStatus(groupId, "ignored");
    const ignored = await store.save(makeEvent({ fingerprint: "A" }));
    expect(ignored.reopened).toBe(false);
    expect((await store.getGroup(groupId))!.group.status).toBe("ignored");
  });

  it("retourne le détail avec les événements récents et le payload", async () => {
    const { groupId } = await store.save(makeEvent({ fingerprint: "A", extra: { orderId: 7 } }));
    const found = await store.getGroup(groupId);
    expect(found!.events).toHaveLength(1);
    expect(found!.events[0].payload).toMatchObject({ user: { mail: "jane@example.com" }, extra: { orderId: 7 } });
    expect(found!.events[0].payload.request).toMatchObject({ curl: expect.stringContaining("curl") });
    expect(await store.getGroup("999999")).toBeNull();
    expect(await store.getGroup("abc")).toBeNull();
  });

  it("filtre par niveau, statut et dates, avec pagination", async () => {
    await store.save(makeEvent({ fingerprint: "A", level: "warning" }));
    await store.save(makeEvent({ fingerprint: "B", level: "error" }));
    expect((await store.listGroups({ level: "warning" })).items).toHaveLength(1);
    expect((await store.listGroups({ from: new Date(Date.now() + 60_000).toISOString() })).total).toBe(0);
    const page = await store.listGroups({ limit: 1, offset: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it("purge les anciens événements et les groupes vides", async () => {
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    await store.save(makeEvent({ fingerprint: "OLD", timestamp: old }));
    await store.save(makeEvent({ fingerprint: "NEW" }));
    expect(await store.purge(30)).toEqual({ events: 1, groups: 1 });
    expect((await store.listGroups()).items.map(g => g.fingerprint)).toEqual(["NEW"]);
  });

  it("dbTransport migre automatiquement et appelle onSaved", async () => {
    const fresh = new MonitorStore(pool, { schema: `${schema}_auto` });
    const onSaved = jest.fn();
    const transport = dbTransport({ store: fresh, onSaved });
    await transport.send(makeEvent());
    expect(onSaved).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ isNew: true }));
    await pool.query(`DROP SCHEMA ${schema}_auto CASCADE`);
  });

  describe("API", () => {
    const build = (auth = (_req: express.Request, _res: express.Response, next: express.NextFunction) => next()) => {
      const app = express();
      app.use("/_monitor", createMonitorRouter({ store, auth }));
      return app;
    };

    it("exige un middleware d'authentification", () => {
      expect(() => createMonitorRouter({ store, auth: [] })).toThrow(/obligatoire/);
    });

    it("bloque l'accès quand l'auth refuse", async () => {
      const app = build((_req, res) => void res.status(401).send("no"));
      expect((await request(app).get("/_monitor/groups")).status).toBe(401);
    });

    it("liste, détaille et change le statut", async () => {
      const app = build();
      const { groupId } = await store.save(makeEvent({ fingerprint: "A" }));

      const list = await request(app).get("/_monitor/groups?status=open&limit=10");
      expect(list.status).toBe(200);
      expect(list.body.total).toBe(1);

      const detail = await request(app).get(`/_monitor/groups/${groupId}`);
      expect(detail.body.group.fingerprint).toBe("A");
      expect(detail.body.events).toHaveLength(1);

      const patch = await request(app).patch(`/_monitor/groups/${groupId}`).send({ status: "resolved" });
      expect(patch.body).toEqual({ id: groupId, status: "resolved" });

      expect((await request(app).patch(`/_monitor/groups/${groupId}`).send({ status: "nope" })).status).toBe(400);
      expect((await request(app).get("/_monitor/groups?level=bad")).status).toBe(400);
      expect((await request(app).get("/_monitor/groups/999999")).status).toBe(404);
      expect((await request(app).get("/_monitor/health")).body).toEqual({ status: "ok" });
    });
  });
});
