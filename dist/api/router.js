"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMonitorRouter = createMonitorRouter;
const crypto_1 = require("crypto");
const express_1 = require("express");
const page_1 = require("../ui/page");
const LEVELS = ["error", "warning", "info"];
const STATUSES = ["open", "resolved", "ignored"];
const asString = (value) => (typeof value === "string" && value ? value : undefined);
const asInt = (value) => {
    const n = Number(asString(value));
    return Number.isInteger(n) ? n : undefined;
};
const asDate = (value) => {
    const raw = asString(value);
    return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : undefined;
};
function createMonitorRouter({ store, auth, ui = true }) {
    if (!auth || (Array.isArray(auth) && auth.length === 0)) {
        throw new Error("createMonitorRouter : l'option `auth` est obligatoire (la route expose des données sensibles).");
    }
    const router = (0, express_1.Router)();
    if (ui) {
        router.get(["/", "/ui"], (_req, res) => {
            const nonce = (0, crypto_1.randomBytes)(16).toString("base64");
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
            res.send((0, page_1.renderUiHtml)(nonce));
        });
    }
    router.use(auth);
    router.use((0, express_1.json)({ limit: "10kb" }));
    const guard = (handler) => (req, res) => {
        handler(req, res).catch(error => {
            console.error("[error-handler] API :", error);
            res.status(500).json({ error: "Erreur interne" });
        });
    };
    router.get("/health", (_req, res) => void res.json({ status: "ok" }));
    router.get("/groups", guard(async (req, res) => {
        const level = asString(req.query.level);
        const status = asString(req.query.status);
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
    }));
    router.get("/stats", guard(async (req, res) => {
        res.json(await store.stats(asInt(req.query.days)));
    }));
    router.get("/groups/:id", guard(async (req, res) => {
        const found = await store.getGroup(String(req.params.id), asInt(req.query.events));
        if (!found) {
            res.status(404).json({ error: "Groupe introuvable" });
            return;
        }
        res.json(found);
    }));
    router.patch("/groups/:id", guard(async (req, res) => {
        const status = req.body?.status;
        if (!status || !STATUSES.includes(status)) {
            res.status(400).json({ error: "status doit valoir open, resolved ou ignored" });
            return;
        }
        if (!(await store.setStatus(String(req.params.id), status))) {
            res.status(404).json({ error: "Groupe introuvable" });
            return;
        }
        res.json({ id: String(req.params.id), status });
    }));
    return router;
}
//# sourceMappingURL=router.js.map