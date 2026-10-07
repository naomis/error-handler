# @naomis/error-handler

Monitoring des erreurs et warnings pour les backends Node / Express : capture avec contexte complet,
regroupement par empreinte, stockage Postgres (schema dédié), alertes e-mail et API protégée.

## Installation

`.npmrc` du projet :

```
@naomis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_TOKEN}
```

```bash
npm install @naomis/error-handler pg
```

`express` et `pg` sont des peerDependencies (`pg` n'est requis que pour le stockage).

## Utilisation

```ts
import {
  createMonitor, createMonitorRouter, createPgStore, dbTransport, emailTransport, consoleTransport,
} from "@naomis/error-handler";

const store = createPgStore({ connectionString: process.env.MONITOR_DATABASE_URL!, schema: "error_monitor" });

export const monitor = createMonitor({
  app: "gestion-cv",
  environment: process.env.ENVIRONMENT,
  version: process.env.APP_VERSION,
  getUser: req => req.connectedUser && { mail: req.connectedUser.mail },
  transports: [
    consoleTransport(),
    dbTransport({ store }), // crée le schema et les tables au premier envoi
    emailTransport({
      to: process.env.ALERT_EMAIL!,
      sendMail: msg => MailService.getInstance().sendMail(msg),
    }),
  ],
});

app.use(monitor.requestHandler());                 // avant bodyParser et les routes
// ... routes ...
app.use("/_monitor", createMonitorRouter({ store, auth: [azureAuth, requireAdmin] }));
app.use(monitor.errorHandler());                   // capture puis next(err)
app.use(yourOwn500Handler);
monitor.installProcessHooks();                     // uncaughtException => flush + exit(1)
```

## Comportement

| Situation | Niveau |
|---|---|
| Réponse 4xx (validation, 401, 404...) | `warning` |
| Réponse 5xx, exception non capturée, rejection non gérée | `error` |
| `captureMessage(msg, { level })` | au choix |

- **Données sensibles** : `password`, `token`, `authorization`, `cookie`, `secret`... sont masquées (headers, body, query, extra).
- **Regroupement** : empreinte = type + message normalisé (ids/nombres retirés) + première frame applicative.
  Un groupe `resolved` qui se reproduit est rouvert ; un groupe `ignored` reste ignoré.
- **E-mail** : par défaut uniquement `error`, une fois par empreinte et par heure (`cooldownMs`).
- **cURL** : chaque événement HTTP contient une commande de reproduction (valeurs sensibles masquées).
- Un transport en échec ne fait jamais planter l'application.

## API (`createMonitorRouter`)

L'option `auth` est obligatoire : le routeur refuse de se créer sans protection.

| Route | Description |
|---|---|
| `GET /health` | état |
| `GET /groups?level=&status=&app=&environment=&from=&to=&limit=&offset=` | liste paginée |
| `GET /groups/:id?events=20` | détail + derniers événements (stack, requête, utilisateur, cURL) |
| `PATCH /groups/:id` `{ "status": "open" \| "resolved" \| "ignored" }` | changer le statut |

## Rétention

```ts
setInterval(() => store.purge(30).catch(console.error), 24 * 3600 * 1000); // supprime > 30 jours
```

## Tests

`npm test`. Les tests Postgres s'exécutent si `TEST_DATABASE_URL` est défini (sinon ils sont ignorés) ; le CI fournit un Postgres.

## Publication

```bash
npm version minor   # ou patch / major (à lancer dans ce dossier)
git push --follow-tags
```
