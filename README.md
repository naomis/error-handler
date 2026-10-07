# @naomis/error-handler

Monitoring des erreurs et warnings pour les backends Node / Express / TypeORM.

> Statut : en construction (phase 1 — squelette et publication).

## Installation

Ajouter dans le `.npmrc` du projet :

```
@naomis:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_TOKEN}
```

```bash
npm install @naomis/error-handler
```

## Publication

```bash
npm version patch   # ou minor / major
git push --follow-tags
```

Le tag `vX.Y.Z` déclenche le workflow `publish.yml`.
