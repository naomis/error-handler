import { randomBytes } from "crypto";
import { json, Request, RequestHandler, Response, Router } from "express";
import type { GroupStatus, MonitorStore } from "../store/store";
import type { Level } from "../types";
import { renderUiHtml } from "../ui/page";

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

const LEVELS: Level[] = ["error", "warning", "info"];
const STATUSES: GroupStatus[] = ["open", "resolved", "ignored"];

const asString = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);
const asInt = (value: unknown): number | undefined => {
  const n = Number(asString(value));
  return Number.isInteger(n) ? n : undefined;
};
const asDate = (value: unknown): string | undefined => {
  const raw = asString(value);
  return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : undefined;
};

export function createMonitorRouter({ store, auth, ui = true }: MonitorRouterOptions): Router {
  if (!auth || (Array.isArray(auth) && auth.length === 0)) {
    throw new Error("createMonitorRouter : l'option `auth` est obligatoire (la route expose des données sensibles).");
  }
  const router = Router();

  if (ui) {
    router.get(["/", "/ui"], (_req, res) => {
      const nonce = randomBytes(16).toString("base64");
      res.set({
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": [
          "default-src 'none'",
          `script-src 'nonce-${nonce}'`,
          `style-src 'nonce-${nonce}'`,
          "connect-src 'self'",
          "base-uri 'none'",
          "form-action 'none'",
          "frame-ancestors 'none'",
        ].join("; "),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      res.send(renderUiHtml(nonce));
    });
  }

  router.use(auth);
  router.use(json({ limit: "10kb" }));

  const guard =
    (handler: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    (req, res) => {
      handler(req, res).catch(error => {
        console.error("[error-handler] API :", error);
        res.status(500).json({ error: "Erreur interne" });
      });
    };

  router.get("/health", (_req, res) => void res.json({ status: "ok" }));

  router.get(
    "/groups",
    guard(async (req, res) => {
      const level = asString(req.query.level) as Level | undefined;
      const status = asString(req.query.status) as GroupStatus | undefined;
      if ((level && !LEVELS.includes(level)) || (status && !STATUSES.includes(status))) {
        res.status(400).json({ error: "level ou status invalide" });
        return;
      }
      const result = await store.listGroups({
        app: asString(req.query.app),
        environment: asString(req.query.environment),
        level,
        status,
        q: asString(req.query.q)?.slice(0, 200),
        from: asDate(req.query.from),
        to: asDate(req.query.to),
        limit: asInt(req.query.limit),
        offset: asInt(req.query.offset),
      });
      res.json(result);
    }),
  );

  router.get(
    "/stats",
    guard(async (req, res) => {
      res.json(await store.stats(asInt(req.query.days)));
    }),
  );

  router.get(
    "/groups/:id",
    guard(async (req, res) => {
      const found = await store.getGroup(String(req.params.id), asInt(req.query.events));
      if (!found) {
        res.status(404).json({ error: "Groupe introuvable" });
        return;
      }
      res.json(found);
    }),
  );

  router.patch(
    "/groups/:id",
    guard(async (req, res) => {
      const status = req.body?.status as GroupStatus | undefined;
      if (!status || !STATUSES.includes(status)) {
        res.status(400).json({ error: "status doit valoir open, resolved ou ignored" });
        return;
      }
      if (!(await store.setStatus(String(req.params.id), status))) {
        res.status(404).json({ error: "Groupe introuvable" });
        return;
      }
      res.json({ id: String(req.params.id), status });
    }),
  );

  return router;
}
