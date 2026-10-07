import { RequestHandler, Router } from "express";
import type { MonitorStore } from "../store/store";
export interface MonitorRouterOptions {
    store: MonitorStore;
    /**
     * Middleware(s) d'authentification/autorisation de l'application (Azure, Keycloak...).
     * Obligatoire : le routeur refuse de se créer sans protection.
     */
    auth: RequestHandler | RequestHandler[];
    /**
     * Sert l'interface web sur `/` et `/ui`. Défaut : true.
     * La page est un squelette statique sans donnée : elle est servie sans `auth` (un navigateur ne peut pas
     * envoyer un jeton Bearer en naviguant). Toutes les données passent par l'API, protégée par `auth`.
     */
    ui?: boolean;
}
export declare function createMonitorRouter({ store, auth, ui }: MonitorRouterOptions): Router;
