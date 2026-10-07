import { MonitorStore, StoreOptions } from "./store";

export interface PgStoreOptions extends StoreOptions {
  connectionString: string;
  /** Pool volontairement petit : le monitoring ne doit pas concurrencer l'application. */
  max?: number;
}

/** Crée un store avec son propre pool `pg`, indépendant du DataSource TypeORM de l'application. */
export function createPgStore({ connectionString, max = 3, ...options }: PgStoreOptions): MonitorStore & { close(): Promise<void> } {
  // `pg` est une peerDependency optionnelle : chargée seulement si ce helper est utilisé.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  const pool = new Pool({ connectionString, max, connectionTimeoutMillis: 5000 });
  pool.on("error", error => console.error("[error-handler] pool pg :", error));
  const store = new MonitorStore(pool, options) as MonitorStore & { close(): Promise<void> };
  store.close = () => pool.end();
  return store;
}
