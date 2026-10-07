"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgStore = createPgStore;
const store_1 = require("./store");
/** Crée un store avec son propre pool `pg`, indépendant du DataSource TypeORM de l'application. */
function createPgStore({ connectionString, max = 3, ...options }) {
    // `pg` est une peerDependency optionnelle : chargée seulement si ce helper est utilisé.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString, max, connectionTimeoutMillis: 5000 });
    pool.on("error", error => console.error("[error-handler] pool pg :", error));
    const store = new store_1.MonitorStore(pool, options);
    store.close = () => pool.end();
    return store;
}
//# sourceMappingURL=pg.js.map