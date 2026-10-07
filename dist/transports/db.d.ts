import type { MonitorStore, SaveResult } from "../store/store";
import type { MonitorEvent, Transport } from "../types";
export interface DbTransportOptions {
    store: MonitorStore;
    /** Exécute `store.migrate()` au premier envoi. Défaut : true. */
    autoMigrate?: boolean;
    /** Appelé après chaque enregistrement (ex. pour notifier uniquement les nouveaux groupes). */
    onSaved?: (event: MonitorEvent, result: SaveResult) => void | Promise<void>;
}
export declare function dbTransport({ store, autoMigrate, onSaved }: DbTransportOptions): Transport;
