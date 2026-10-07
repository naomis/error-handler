import type { Level, MonitorEvent } from "../types";
/** Sous-ensemble de `pg.Pool` / `pg.Client` dont le store a besoin. */
export interface Queryable {
    query(text: string, params?: unknown[]): Promise<{
        rows: any[];
        rowCount?: number | null;
    }>;
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
export declare class MonitorStore {
    private readonly db;
    readonly schema: string;
    constructor(db: Queryable, options?: StoreOptions);
    private t;
    /** Crée le schema et les tables. Idempotent : peut être appelé à chaque démarrage. */
    migrate(): Promise<void>;
    save(event: MonitorEvent): Promise<SaveResult>;
    listGroups(query?: ListGroupsQuery): Promise<{
        items: ErrorGroup[];
        total: number;
    }>;
    getGroup(id: string, eventLimit?: number): Promise<{
        group: ErrorGroup;
        events: StoredEvent[];
    } | null>;
    setStatus(id: string, status: GroupStatus): Promise<boolean>;
    /** Supprime les événements plus anciens que `days`, puis les groupes devenus vides et inactifs. */
    purge(days: number): Promise<{
        events: number;
        groups: number;
    }>;
}
