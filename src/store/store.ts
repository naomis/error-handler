import type { Level, MonitorEvent } from "../types";

/** Sous-ensemble de `pg.Pool` / `pg.Client` dont le store a besoin. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export type GroupStatus = "open" | "resolved" | "ignored";

export interface ErrorGroup {
  id: string;
  fingerprint: string;
  app: string;
  environment: string;
  level: Level;
  type: string;
  message: string;
  errorName: string | null;
  status: GroupStatus;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export interface StoredEvent {
  id: string;
  groupId: string;
  timestamp: string;
  level: Level;
  type: string;
  message: string;
  stack: string | null;
  version: string | null;
  payload: Record<string, unknown>;
}

export interface SaveResult {
  groupId: string;
  isNew: boolean;
  /** Le groupe était `resolved` et vient de se reproduire. */
  reopened: boolean;
}

export interface ListGroupsQuery {
  app?: string;
  environment?: string;
  level?: Level;
  status?: GroupStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface StoreOptions {
  /** Schema Postgres dédié. Défaut : `error_monitor`. */
  schema?: string;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/i;

const GROUP_COLUMNS = `id::text, fingerprint, app, environment, level, type, message, error_name AS "errorName",
  status, count, first_seen AS "firstSeen", last_seen AS "lastSeen"`;
const EVENT_COLUMNS = `id::text, group_id::text AS "groupId", timestamp, level, type, message, stack, version, payload`;

const iso = (value: unknown): string => (value instanceof Date ? value.toISOString() : String(value));

export class MonitorStore {
  readonly schema: string;

  constructor(
    private readonly db: Queryable,
    options: StoreOptions = {},
  ) {
    const schema = options.schema ?? "error_monitor";
    if (!IDENTIFIER.test(schema)) throw new Error(`Nom de schema invalide : "${schema}"`);
    this.schema = schema;
  }

  private t(name: string): string {
    return `"${this.schema}"."${name}"`;
  }

  /** Crée le schema et les tables. Idempotent : peut être appelé à chaque démarrage. */
  async migrate(): Promise<void> {
    const statements = [
      `CREATE SCHEMA IF NOT EXISTS "${this.schema}"`,
      `CREATE TABLE IF NOT EXISTS ${this.t("error_group")} (
        id          BIGSERIAL PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        app         TEXT NOT NULL,
        environment TEXT NOT NULL DEFAULT '',
        level       TEXT NOT NULL,
        type        TEXT NOT NULL,
        message     TEXT NOT NULL,
        error_name  TEXT,
        status      TEXT NOT NULL DEFAULT 'open',
        count       INTEGER NOT NULL DEFAULT 1,
        first_seen  TIMESTAMPTZ NOT NULL,
        last_seen   TIMESTAMPTZ NOT NULL,
        UNIQUE (app, environment, fingerprint)
      )`,
      `CREATE INDEX IF NOT EXISTS error_group_last_seen_idx ON ${this.t("error_group")} (last_seen DESC)`,
      `CREATE TABLE IF NOT EXISTS ${this.t("error_event")} (
        id        UUID PRIMARY KEY,
        group_id  BIGINT NOT NULL REFERENCES ${this.t("error_group")}(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL,
        level     TEXT NOT NULL,
        type      TEXT NOT NULL,
        message   TEXT NOT NULL,
        stack     TEXT,
        version   TEXT,
        payload   JSONB NOT NULL DEFAULT '{}'
      )`,
      `CREATE INDEX IF NOT EXISTS error_event_group_idx ON ${this.t("error_event")} (group_id, timestamp DESC)`,
    ];
    for (const sql of statements) await this.db.query(sql);
  }

  async save(event: MonitorEvent): Promise<SaveResult> {
    const environment = event.environment ?? "";
    const upsert = await this.db.query(
      `INSERT INTO ${this.t("error_group")} AS g
         (fingerprint, app, environment, level, type, message, error_name, first_seen, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       ON CONFLICT (app, environment, fingerprint) DO UPDATE SET
         count     = g.count + 1,
         last_seen = GREATEST(g.last_seen, EXCLUDED.last_seen),
         level     = CASE WHEN EXCLUDED.level = 'error' THEN 'error' ELSE g.level END,
         status    = CASE WHEN g.status = 'resolved' THEN 'open' ELSE g.status END
       RETURNING id::text, (xmax = 0) AS inserted,
         (SELECT status FROM ${this.t("error_group")} WHERE id = g.id) AS previous_status`,
      [event.fingerprint, event.app, environment, event.level, event.type, event.message, event.errorName ?? null, event.timestamp],
    );
    const row = upsert.rows[0];
    const groupId: string = row.id;

    await this.db.query(
      `INSERT INTO ${this.t("error_event")} (id, group_id, timestamp, level, type, message, stack, version, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        event.id,
        groupId,
        event.timestamp,
        event.level,
        event.type,
        event.message,
        event.stack ?? null,
        event.version ?? null,
        JSON.stringify({ request: event.request, user: event.user, runtime: event.runtime, extra: event.extra }),
      ],
    );
    return { groupId, isNew: row.inserted, reopened: !row.inserted && row.previous_status === "resolved" };
  }

  async listGroups(query: ListGroupsQuery = {}): Promise<{ items: ErrorGroup[]; total: number }> {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace("?", `$${params.length}`));
    };
    if (query.app) add("app = ?", query.app);
    if (query.environment !== undefined) add("environment = ?", query.environment);
    if (query.level) add("level = ?", query.level);
    if (query.status) add("status = ?", query.status);
    if (query.from) add("last_seen >= ?", query.from);
    if (query.to) add("last_seen <= ?", query.to);
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const [list, count] = await Promise.all([
      this.db.query(
        `SELECT ${GROUP_COLUMNS} FROM ${this.t("error_group")} ${clause}
         ORDER BY last_seen DESC LIMIT ${limit} OFFSET ${offset}`,
        params,
      ),
      this.db.query(`SELECT count(*)::int AS total FROM ${this.t("error_group")} ${clause}`, params),
    ]);
    return {
      items: list.rows.map(r => ({ ...r, firstSeen: iso(r.firstSeen), lastSeen: iso(r.lastSeen) })),
      total: count.rows[0].total,
    };
  }

  async getGroup(id: string, eventLimit = 20): Promise<{ group: ErrorGroup; events: StoredEvent[] } | null> {
    if (!/^\d+$/.test(id)) return null;
    const group = await this.db.query(`SELECT ${GROUP_COLUMNS} FROM ${this.t("error_group")} WHERE id = $1`, [id]);
    if (!group.rows[0]) return null;
    const events = await this.db.query(
      `SELECT ${EVENT_COLUMNS} FROM ${this.t("error_event")} WHERE group_id = $1 ORDER BY timestamp DESC LIMIT $2`,
      [id, Math.min(Math.max(eventLimit, 1), 100)],
    );
    const g = group.rows[0];
    return {
      group: { ...g, firstSeen: iso(g.firstSeen), lastSeen: iso(g.lastSeen) },
      events: events.rows.map(e => ({ ...e, timestamp: iso(e.timestamp) })),
    };
  }

  async setStatus(id: string, status: GroupStatus): Promise<boolean> {
    if (!/^\d+$/.test(id)) return false;
    const result = await this.db.query(`UPDATE ${this.t("error_group")} SET status = $2 WHERE id = $1`, [id, status]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Supprime les événements plus anciens que `days`, puis les groupes devenus vides et inactifs. */
  async purge(days: number): Promise<{ events: number; groups: number }> {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const events = await this.db.query(`DELETE FROM ${this.t("error_event")} WHERE timestamp < $1`, [cutoff]);
    const groups = await this.db.query(
      `DELETE FROM ${this.t("error_group")} g WHERE g.last_seen < $1
         AND NOT EXISTS (SELECT 1 FROM ${this.t("error_event")} e WHERE e.group_id = g.id)`,
      [cutoff],
    );
    return { events: events.rowCount ?? 0, groups: groups.rowCount ?? 0 };
  }
}
