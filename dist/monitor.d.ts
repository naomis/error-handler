import type { NextFunction, Request, RequestHandler, Response } from "express";
import { RedactOptions } from "./core/redact";
import type { Level, MonitorEvent, Transport, UserInfo } from "./types";
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
export declare function levelForStatus(status: number): Level;
export declare function createMonitor(options: MonitorOptions): Monitor;
