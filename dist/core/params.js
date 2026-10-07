"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferParams = inferParams;
/**
 * Express réinitialise `req.params` en sortant de la route : dans un error handler il est vide.
 * On le reconstruit à partir du pattern de la route (`/users/:id`) et du chemin de la requête.
 */
function inferParams(routePath, originalUrl) {
    if (typeof routePath !== "string" || !routePath.includes(":"))
        return undefined;
    const names = [];
    const pattern = routePath
        .split("/")
        .map(segment => {
        const match = /^:(\w+)\??$/.exec(segment);
        if (!match)
            return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        names.push(match[1]);
        return "([^/]+)";
    })
        .join("/");
    const pathname = originalUrl.split("?")[0];
    const found = new RegExp(`${pattern}/?$`).exec(pathname);
    if (!found)
        return undefined;
    const params = {};
    names.forEach((name, index) => {
        try {
            params[name] = decodeURIComponent(found[index + 1]);
        }
        catch {
            params[name] = found[index + 1];
        }
    });
    return params;
}
//# sourceMappingURL=params.js.map