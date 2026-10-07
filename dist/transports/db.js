"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbTransport = dbTransport;
function dbTransport({ store, autoMigrate = true, onSaved }) {
    let ready;
    const ensureReady = () => {
        if (!autoMigrate)
            return Promise.resolve();
        // En cas d'échec on réessaiera au prochain envoi.
        ready ?? (ready = store.migrate().catch(error => {
            ready = undefined;
            throw error;
        }));
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
//# sourceMappingURL=db.js.map