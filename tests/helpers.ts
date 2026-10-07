import { randomUUID } from "crypto";
import type { MonitorEvent } from "../src";

export function makeEvent(overrides: Partial<MonitorEvent> = {}): MonitorEvent {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level: "error",
    type: "requestError",
    message: "boom",
    errorName: "Error",
    stack: "Error: boom\n    at fn (/app/x.ts:1:1)",
    fingerprint: "fp1",
    app: "test-app",
    environment: "test",
    version: "1.0.0",
    runtime: { node: "v20", platform: "linux", hostname: "h", pid: 1, uptimeSec: 1, memory: { rssMb: 1, heapUsedMb: 1 } },
    request: { method: "GET", url: "/x", route: "/x", statusCode: 500, curl: "curl -X GET 'http://x/x'" },
    user: { mail: "jane@example.com" },
    ...overrides,
  };
}
