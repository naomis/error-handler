import { MonitorStore, Queryable, StoreOptions } from "./store";

/** Forme minimale d'un `DataSource` TypeORM (évite de dépendre de `typeorm`). */
export interface TypeOrmDataSourceLike {
  createQueryRunner(): {
    query(sql: string, parameters?: unknown[], useStructuredResult?: boolean): Promise<any>;
    release(): Promise<void>;
  };
}

/**
 * Réutilise le DataSource TypeORM de l'application : pas de second pool ni d'URL à configurer.
 * Le DataSource doit être initialisé avant le premier événement (les envois en échec ne cassent rien).
 * Le schema dédié reste invisible pour TypeORM : `synchronize` et les migrations de l'application n'y touchent pas.
 */
export function createTypeOrmStore(dataSource: TypeOrmDataSourceLike, options: StoreOptions = {}): MonitorStore {
  const db: Queryable = {
    async query(text, params) {
      const runner = dataSource.createQueryRunner();
      try {
        // Résultat structuré : même forme pour SELECT, INSERT, UPDATE et DELETE.
        const result = await runner.query(text, params, true);
        const rows: any[] = result.records ?? [];
        return { rows, rowCount: result.affected ?? rows.length };
      } finally {
        await runner.release();
      }
    },
  };
  return new MonitorStore(db, options);
}
