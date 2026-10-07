"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeOrmStore = createTypeOrmStore;
const store_1 = require("./store");
/**
 * Réutilise le DataSource TypeORM de l'application : pas de second pool ni d'URL à configurer.
 * Le DataSource doit être initialisé avant le premier événement (les envois en échec ne cassent rien).
 * Le schema dédié reste invisible pour TypeORM : `synchronize` et les migrations de l'application n'y touchent pas.
 */
function createTypeOrmStore(dataSource, options = {}) {
    const db = {
        async query(text, params) {
            const runner = dataSource.createQueryRunner();
            try {
                // Résultat structuré : même forme pour SELECT, INSERT, UPDATE et DELETE.
                const result = await runner.query(text, params, true);
                const rows = result.records ?? [];
                return { rows, rowCount: result.affected ?? rows.length };
            }
            finally {
                await runner.release();
            }
        },
    };
    return new store_1.MonitorStore(db, options);
}
//# sourceMappingURL=typeorm.js.map