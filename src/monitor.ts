import { randomUUID } from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { hostname } from "os";
import { requestScope } from "./core/context";
import { buildCurl } from "./core/curl";
import { computeFingerprint } from "./core/fingerprint";
import { inferParams } from "./core/params";
import { redact, RedactOptions } from "./core/redact";
import { consoleTransport } from "./transports/basic";
import type { Level, MonitorEvent, RequestInfo, Transport, UserInfo } from "./types";

export interface MonitorOptions {
  app: string;
  environment?: string;
  version?: string;
  /** Par défaut : transport console. */
  transports?: Transport[];
  /** Appelé au moment de la capture, donc après le middleware d'authentification. */
  getUser?: (req: Request) => UserInfo | undefined;
  redact?: RedactOptions;
  /** Permet de modifier ou d'ignorer (en retournant `null`) un événement avant envoi. */
  beforeSend?: (event: MonitorEvent) => MonitorEvent | null;
  onTransportError?: (transport: Transport, error: unknown) => void;
}

export interface CaptureOptions {
  level?: Level;
  type?: string;
  statusCode?: number;
  req?: Request;
  extra?: Record<string, unknown>;
}

export interface ProcessHooksOptions {
  /** Défaut : true. Après une exception non capturée, l'état de Node est indéterminé. */
  exitOnUncaughtException?: boolean;
  /** Défaut : false. */
  exitOnUnhandledRejection?: boolean;
  flushTimeoutMs?: number;
}

export interface Monitor {
  captureException(error: unknown, options?: CaptureOptions): MonitorEvent | null;
  captureMessage(message: string, options?: CaptureOptions): MonitorEvent | null;
  setUser(user: UserInfo): void;
  requestHandler(): RequestHandler;
  /** Capture puis délègue à `next(err)` : la réponse reste à la charge de l'application. */
  errorHandler(): (err: unknown, req: Request, res: Response, next: NextFunction) => void;
  installProcessHooks(options?: ProcessHooksOptions): () => void;
  flush(timeoutMs?: number): Promise<void>;
}

export function levelForStatus(status: number): Level {
  return status >= 500 ? "error" : "warning";
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string") return new Error(value);
  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  const error = new Error(text);
  error.name = "NonErrorThrown";
  return error;
}

function statusOf(err: unknown): number {
  const candidate = (err as { status?: unknown; statusCode?: unknown } | null) ?? {};
  const status = Number(candidate.status ?? candidate.statusCode);
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}

const mb = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 10) / 10;
const SAFE_REQUEST_ID = /^[\w.-]{1,100}$/;

export function createMonitor(options: MonitorOptions): Monitor {
  const transports = options.transports ?? [consoleTransport()];
  const pending = new Set<Promise<unknown>>();

  const resolveUser = (req?: Request): UserInfo | undefined => {
    const scope = requestScope.get();
    if (scope?.user) return scope.user;
    const target = req ?? scope?.req;
    return target && options.getUser ? options.getUser(target) : undefined;
  };

  const buildRequestInfo = (req: Request, statusCode?: number): RequestInfo => {
    const scope = requestScope.get();
    const headers = redact(req.headers, options.redact) as Record<string, unknown>;
    const body = redact(req.body, options.redact);
    const route = req.route?.path ? `${req.baseUrl ?? ""}${req.route.path}` : undefined;
    const hasParams = req.params && Object.keys(req.params).length > 0;
    const params = hasParams ? req.params : inferParams(req.route?.path, req.originalUrl);
    const host = req.get?.("host");
    const absoluteUrl = host ? `${req.protocol}://${host}${req.originalUrl}` : req.originalUrl;
    return {
      requestId: scope?.requestId,
      method: req.method,
      url: req.originalUrl,
      route,
      params: redact(params, options.redact),
      query: redact(req.query, options.redact),
      headers,
      body,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
      statusCode,
      durationMs: scope ? Date.now() - scope.startedAt : undefined,
      curl: buildCurl({ method: req.method, url: absoluteUrl, headers, body }),
    };
  };

  const dispatch = (event: MonitorEvent): MonitorEvent | null => {
    const finalEvent = options.beforeSend ? options.beforeSend(event) : event;
    if (!finalEvent) return null;
    for (const transport of transports) {
      let task: Promise<unknown>;
      try {
        task = Promise.resolve(transport.send(finalEvent));
      } catch (error) {
        task = Promise.reject(error);
      }
      const tracked: Promise<unknown> = task
        .catch(error => {
          if (options.onTransportError) options.onTransportError(transport, error);
          else console.error(`[error-handler] transport "${transport.name}" a échoué :`, error);
        })
        .finally(() => pending.delete(tracked));
      pending.add(tracked);
    }
    return finalEvent;
  };

  const build = (error: Error, type: string, level: Level, opts: CaptureOptions): MonitorEvent => {
    const req = opts.req ?? requestScope.get()?.req;
    const memory = process.memoryUsage();
    return {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      type,
      message: error.message,
      errorName: error.name,
      stack: error.stack,
      fingerprint: computeFingerprint(type, error),
      app: options.app,
      environment: options.environment,
      version: options.version,
      runtime: {
        node: process.version,
        platform: process.platform,
        hostname: hostname(),
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        memory: { rssMb: mb(memory.rss), heapUsedMb: mb(memory.heapUsed) },
      },
      request: req ? buildRequestInfo(req, opts.statusCode) : undefined,
      user: resolveUser(req),
      extra: opts.extra ? (redact(opts.extra, options.redact) as Record<string, unknown>) : undefined,
    };
  };

  const flush = async (timeoutMs = 3000): Promise<void> => {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>(resolve => {
      timer = setTimeout(resolve, timeoutMs);
      timer.unref();
    });
    const drain = (async () => {
      await Promise.allSettled([...pending]);
      await Promise.allSettled(transports.map(transport => transport.flush?.()));
    })();
    await Promise.race([drain, timeout]);
    if (timer) clearTimeout(timer);
  };

  const monitor: Monitor = {
    captureException(error, opts = {}) {
      const err = toError(error);
      const level = opts.level ?? (opts.statusCode ? levelForStatus(opts.statusCode) : "error");
      return dispatch(build(err, opts.type ?? "exception", level, opts));
    },

    captureMessage(message, opts = {}) {
      const error = new Error(message);
      error.name = "Message";
      return dispatch(build(error, opts.type ?? "message", opts.level ?? "info", opts));
    },

    setUser(user) {
      const scope = requestScope.get();
      if (scope) scope.user = user;
    },

    requestHandler() {
      return (req, res, next) => {
        const incoming = req.headers["x-request-id"];
        const requestId = typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader("x-request-id", requestId);
        requestScope.run({ requestId, startedAt: Date.now(), req }, next);
      };
    },

    errorHandler() {
      return (err, req, _res, next) => {
        monitor.captureException(err, { type: "requestError", statusCode: statusOf(err), req });
        next(err);
      };
    },

    installProcessHooks(hookOptions = {}) {
      const { exitOnUncaughtException = true, exitOnUnhandledRejection = false, flushTimeoutMs = 3000 } = hookOptions;

      const onUncaught = (error: Error): void => {
        monitor.captureException(error, { type: "uncaughtException", level: "error" });
        if (exitOnUncaughtException) void flush(flushTimeoutMs).finally(() => process.exit(1));
      };
      const onRejection = (reason: unknown): void => {
        monitor.captureException(reason, { type: "unhandledRejection", level: "error" });
        if (exitOnUnhandledRejection) void flush(flushTimeoutMs).finally(() => process.exit(1));
      };

      process.on("uncaughtException", onUncaught);
      process.on("unhandledRejection", onRejection);
      return () => {
        process.off("uncaughtException", onUncaught);
        process.off("unhandledRejection", onRejection);
      };
    },

    flush,
  };

  return monitor;
}
