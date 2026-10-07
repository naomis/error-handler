import { MonitorStore, StoreOptions } from "./store";
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
export declare function createTypeOrmStore(dataSource: TypeOrmDataSourceLike, options?: StoreOptions): MonitorStore;
