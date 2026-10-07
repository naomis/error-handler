import { RequestHandler, Router } from "express";
import type { MonitorStore } from "../store/store";
export interface MonitorRouterOptions {
    store: MonitorStore;
    /**
     * Middleware(s) d'authentification/autorisation de l'application (Azure, Keycloak...).
     * Obligatoire : le routeur refuse de se créer sans protection.
     */
    auth: RequestHandler | RequestHandler[];
}
export declare function createMonitorRouter({ store, auth }: MonitorRouterOptions): Router;
