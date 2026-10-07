import type { MonitorStore, SaveResult } from "../store/store";
import type { MonitorEvent, Transport } from "../types";

export interface DbTransportOptions {
  store: MonitorStore;
  /** Exécute `store.migrate()` au premier envoi. Défaut : true. */
  autoMigrate?: boolean;
  /** Appelé après chaque enregistrement (ex. pour notifier uniquement les nouveaux groupes). */
  onSaved?: (event: MonitorEvent, result: SaveResult) => void | Promise<void>;
}

export function dbTransport({ store, autoMigrate = true, onSaved }: DbTransportOptions): Transport {
  let ready: Promise<void> | undefined;
  const ensureReady = (): Promise<void> => {
    if (!autoMigrate) return Promise.resolve();
    // En cas d'échec on réessaiera au prochain envoi.
    ready ??= store.migrate().catch(error => {
      ready = undefined;
      throw error;
    });
    return ready;
  };

  return {
    name: "db",
    async send(event) {
      await ensureReady();
      const result = await store.save(event);
      await onSaved?.(event, result);
    },
  };
}
