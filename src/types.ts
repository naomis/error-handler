export type Level = "error" | "warning" | "info";

export interface UserInfo {
  mail?: string;
  oid?: string;
  tid?: string;
  [key: string]: unknown;
}

export interface RequestInfo {
  requestId?: string;
  method: string;
  url: string;
  /** Route pattern Express (ex. `/users/:id`), si elle a été résolue. */
  route?: string;
  params?: unknown;
  query?: unknown;
  headers?: unknown;
  body?: unknown;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  durationMs?: number;
  /** Commande cURL pour rejouer la requête (valeurs sensibles masquées). */
  curl?: string;
}

export interface RuntimeInfo {
  node: string;
  platform: string;
  hostname: string;
  pid: number;
  uptimeSec: number;
  memory: { rssMb: number; heapUsedMb: number };
}

export interface MonitorEvent {
  id: string;
  timestamp: string;
  level: Level;
  /** Catégorie : `requestError`, `uncaughtException`, `unhandledRejection`, `message`... */
  type: string;
  message: string;
  errorName?: string;
  stack?: string;
  fingerprint: string;
  app: string;
  environment?: string;
  version?: string;
  runtime: RuntimeInfo;
  request?: RequestInfo;
  user?: UserInfo;
  extra?: Record<string, unknown>;
}

export interface Transport {
  name: string;
  send(event: MonitorEvent): Promise<void> | void;
  /** Vide les files d'attente internes avant l'arrêt du processus. */
  flush?(): Promise<void> | void;
}
