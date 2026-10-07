import { DataSource } from "typeorm";
import { createMonitor, createTypeOrmStore, dbTransport } from "../src";
import { makeEvent } from "./helpers";

const url = process.env.TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

describeDb("createTypeOrmStore", () => {
  const schema = "error_monitor_typeorm";
  const dataSource = new DataSource({ type: "postgres", url, synchronize: false, entities: [] });

  beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  });
  afterAll(async () => {
    await dataSource.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await dataSource.destroy();
  });

  it("migre, enregistre, regroupe et purge via le DataSource", async () => {
    const store = createTypeOrmStore(dataSource, { schema });
    await store.migrate();
    const first = await store.save(makeEvent({ fingerprint: "A" }));
    const second = await store.save(makeEvent({ fingerprint: "A" }));
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);

    const { items } = await store.listGroups();
    expect(items[0]).toMatchObject({ count: 2, status: "open" });
    expect(await store.setStatus(first.groupId, "resolved")).toBe(true);
    expect(await store.setStatus("999999", "resolved")).toBe(false);
    expect((await store.getGroup(first.groupId))!.events).toHaveLength(2);

    await store.save(makeEvent({ fingerprint: "OLD", timestamp: new Date(Date.now() - 40 * 86_400_000).toISOString() }));
    expect(await store.purge(30)).toEqual({ events: 1, groups: 1 });
  });

  it("de bout en bout : monitor -> dbTransport -> TypeORM", async () => {
    const store = createTypeOrmStore(dataSource, { schema });
    const monitor = createMonitor({ app: "e2e", environment: "test", transports: [dbTransport({ store })] });
    monitor.captureException(new Error("échec e2e"), { type: "requestError", statusCode: 404 });
    await monitor.flush();
    const { items } = await store.listGroups({ app: "e2e" });
    expect(items[0]).toMatchObject({ level: "warning", message: "échec e2e", count: 1 });
  });
});
