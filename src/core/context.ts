import { AsyncLocalStorage } from "async_hooks";
import type { Request } from "express";
import type { UserInfo } from "../types";

export interface RequestScope {
  requestId: string;
  startedAt: number;
  req?: Request;
  user?: UserInfo;
}

const storage = new AsyncLocalStorage<RequestScope>();

export const requestScope = {
  run: <T>(scope: RequestScope, fn: () => T): T => storage.run(scope, fn),
  get: (): RequestScope | undefined => storage.getStore(),
};
