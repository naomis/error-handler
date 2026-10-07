import { MonitorStore, StoreOptions } from "./store";
export interface PgStoreOptions extends StoreOptions {
    connectionString: string;
    /** Pool volontairement petit : le monitoring ne doit pas concurrencer l'application. */
    max?: number;
}
/** Crée un store avec son propre pool `pg`, indépendant du DataSource TypeORM de l'application. */
export declare function createPgStore({ connectionString, max, ...options }: PgStoreOptions): MonitorStore & {
    close(): Promise<void>;
};
