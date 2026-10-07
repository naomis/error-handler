"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelForStatus = levelForStatus;
exports.createMonitor = createMonitor;
const crypto_1 = require("crypto");
const os_1 = require("os");
const context_1 = require("./core/context");
const curl_1 = require("./core/curl");
const fingerprint_1 = require("./core/fingerprint");
const params_1 = require("./core/params");
const redact_1 = require("./core/redact");
const basic_1 = require("./transports/basic");
function levelForStatus(status) {
    return status >= 500 ? "error" : "warning";
}
function toError(value) {
    if (value instanceof Error)
        return value;
    if (typeof value === "string")
        return new Error(value);
    let text;
    try {
        text = JSON.stringify(value) ?? String(value);
    }
    catch {
        text = String(value);
    }
    const error = new Error(text);
    error.name = "NonErrorThrown";
    return error;
}
function statusOf(err) {
    const candidate = err ?? {};
    const status = Number(candidate.status ?? candidate.statusCode);
    return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}
const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 10) / 10;
const SAFE_REQUEST_ID = /^[\w.-]{1,100}$/;
function createMonitor(options) {
    const transports = options.transports ?? [(0, basic_1.consoleTransport)()];
    const pending = new Set();
    const resolveUser = (req) => {
        const scope = context_1.requestScope.get();
        if (scope?.user)
            return scope.user;
        const target = req ?? scope?.req;
        return target && options.getUser ? options.getUser(target) : undefined;
    };
    const buildRequestInfo = (req, statusCode) => {
        const scope = context_1.requestScope.get();
        const headers = (0, redact_1.redact)(req.headers, options.redact);
        const body = (0, redact_1.redact)(req.body, options.redact);
        const route = req.route?.path ? `${req.baseUrl ?? ""}${req.route.path}` : undefined;
        const hasParams = req.params && Object.keys(req.params).length > 0;
        const params = hasParams ? req.params : (0, params_1.inferParams)(req.route?.path, req.originalUrl);
        const host = req.get?.("host");
        const absoluteUrl = host ? `${req.protocol}://${host}${req.originalUrl}` : req.originalUrl;
        return {
            requestId: scope?.requestId,
            method: req.method,
            url: req.originalUrl,
            route,
            params: (0, redact_1.redact)(params, options.redact),
            query: (0, redact_1.redact)(req.query, options.redact),
            headers,
            body,
            ip: req.ip,
            userAgent: req.headers?.["user-agent"],
            statusCode,
            durationMs: scope ? Date.now() - scope.startedAt : undefined,
            curl: (0, curl_1.buildCurl)({ method: req.method, url: absoluteUrl, headers, body }),
        };
    };
    const dispatch = (event) => {
        const finalEvent = options.beforeSend ? options.beforeSend(event) : event;
        if (!finalEvent)
            return null;
        for (const transport of transports) {
            let task;
            try {
                task = Promise.resolve(transport.send(finalEvent));
            }
            catch (error) {
                task = Promise.reject(error);
            }
            const tracked = task
                .catch(error => {
                if (options.onTransportError)
                    options.onTransportError(transport, error);
                else
                    console.error(`[error-handler] transport "${transport.name}" a échoué :`, error);
            })
                .finally(() => pending.delete(tracked));
            pending.add(tracked);
        }
        return finalEvent;
    };
    const build = (error, type, level, opts) => {
        const req = opts.req ?? context_1.requestScope.get()?.req;
        const memory = process.memoryUsage();
        return {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            level,
            type,
            message: error.message,
            errorName: error.name,
            stack: error.stack,
            fingerprint: (0, fingerprint_1.computeFingerprint)(type, error),
            app: options.app,
            environment: options.environment,
            version: options.version,
            runtime: {
                node: process.version,
                platform: process.platform,
                hostname: (0, os_1.hostname)(),
                pid: process.pid,
                uptimeSec: Math.round(process.uptime()),
                memory: { rssMb: mb(memory.rss), heapUsedMb: mb(memory.heapUsed) },
            },
            request: req ? buildRequestInfo(req, opts.statusCode) : undefined,
            user: resolveUser(req),
            extra: opts.extra ? (0, redact_1.redact)(opts.extra, options.redact) : undefined,
        };
    };
    const flush = async (timeoutMs = 3000) => {
        let timer;
        const timeout = new Promise(resolve => {
            timer = setTimeout(resolve, timeoutMs);
            timer.unref();
        });
        const drain = (async () => {
            await Promise.allSettled([...pending]);
            await Promise.allSettled(transports.map(transport => transport.flush?.()));
        })();
        await Promise.race([drain, timeout]);
        if (timer)
            clearTimeout(timer);
    };
    const monitor = {
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
            const scope = context_1.requestScope.get();
            if (scope)
                scope.user = user;
        },
        requestHandler() {
            return (req, res, next) => {
                const incoming = req.headers["x-request-id"];
                const requestId = typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming) ? incoming : (0, crypto_1.randomUUID)();
                res.setHeader("x-request-id", requestId);
                context_1.requestScope.run({ requestId, startedAt: Date.now(), req }, next);
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
            const onUncaught = (error) => {
                monitor.captureException(error, { type: "uncaughtException", level: "error" });
                if (exitOnUncaughtException)
                    void flush(flushTimeoutMs).finally(() => process.exit(1));
            };
            const onRejection = (reason) => {
                monitor.captureException(reason, { type: "unhandledRejection", level: "error" });
                if (exitOnUnhandledRejection)
                    void flush(flushTimeoutMs).finally(() => process.exit(1));
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
//# sourceMappingURL=monitor.js.map