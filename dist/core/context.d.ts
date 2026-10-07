import type { Request } from "express";
import type { UserInfo } from "../types";
export interface RequestScope {
    requestId: string;
    startedAt: number;
    req?: Request;
    user?: UserInfo;
}
export declare const requestScope: {
    run: <T>(scope: RequestScope, fn: () => T) => T;
    get: () => RequestScope | undefined;
};
