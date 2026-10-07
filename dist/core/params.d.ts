/**
 * Express réinitialise `req.params` en sortant de la route : dans un error handler il est vide.
 * On le reconstruit à partir du pattern de la route (`/users/:id`) et du chemin de la requête.
 */
export declare function inferParams(routePath: unknown, originalUrl: string): Record<string, string> | undefined;
