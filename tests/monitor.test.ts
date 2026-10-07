import express from "express";
import request from "supertest";
import { createMonitor, memoryTransport } from "../src";

function setup(extra: Partial<Parameters<typeof createMonitor>[0]> = {}) {
  const memory = memoryTransport();
  const monitor = createMonitor({ app: "test-app", environment: "test", version: "1.2.3", transports: [memory], ...extra });
  return { memory, monitor };
}

describe("captureException / captureMessage", () => {
  it("construit un événement complet", async () => {
    const { memory, monitor } = setup();
    monitor.captureException(new Error("boom"), { extra: { password: "x", orderId: 7 } });
    await monitor.flush();
    const [event] = memory.events;
    expect(event).toMatchObject({ level: "error", message: "boom", app: "test-app", environment: "test", version: "1.2.3" });
    expect(event.fingerprint).toHaveLength(16);
    expect(event.runtime.node).toBe(process.version);
    expect(event.extra).toEqual({ password: "[REDACTED]", orderId: 7 });
  });

  it("accepte des valeurs qui ne sont pas des Error", async () => {
    const { memory, monitor } = setup();
    monitor.captureException({ code: 1 });
    monitor.captureMessage("info", { level: "warning" });
    await monitor.flush();
    expect(memory.events[0]).toMatchObject({ errorName: "NonErrorThrown", message: '{"code":1}' });
    expect(memory.events[1]).toMatchObject({ level: "warning", type: "message" });
  });

  it("beforeSend peut ignorer un événement", async () => {
    const { memory, monitor } = setup({ beforeSend: () => null });
    expect(monitor.captureException(new Error("x"))).toBeNull();
    await monitor.flush();
    expect(memory.events).toHaveLength(0);
  });

  it("un transport en échec ne fait jamais planter l'appelant", async () => {
    const onTransportError = jest.fn();
    const failing = { name: "failing", send: () => Promise.reject(new Error("down")) };
    const { monitor } = setup({ transports: [failing], onTransportError });
    expect(() => monitor.captureException(new Error("x"))).not.toThrow();
    await monitor.flush();
    expect(onTransportError).toHaveBeenCalledTimes(1);
  });
});

describe("intégration Express", () => {
  const build = () => {
    const { memory, monitor } = setup({
      getUser: req => ((req as unknown as { connectedUser?: { mail: string } }).connectedUser),
    });
    const app = express();
    app.use(monitor.requestHandler());
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { connectedUser: { mail: string } }).connectedUser = { mail: "jane@example.com" };
      next();
    });
    app.post("/users/:id", () => {
      throw new Error("Échec utilisateur 42");
    });
    app.get("/notfound", (_req, _res, next) => next(Object.assign(new Error("Introuvable"), { status: 404 })));
    app.use(monitor.errorHandler());
    app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(err.status ?? 500).send("erreur");
    });
    return { app, memory, monitor };
  };

  it("capture une erreur 500 avec le contexte de la requête", async () => {
    const { app, memory, monitor } = build();
    const res = await request(app)
      .post("/users/42?debug=1")
      .set("Authorization", "Bearer abc")
      .send({ name: "Jane", password: "hunter2" });
    await monitor.flush();

    expect(res.status).toBe(500);
    const [event] = memory.events;
    expect(event.level).toBe("error");
    expect(event.type).toBe("requestError");
    expect(event.user).toEqual({ mail: "jane@example.com" });
    expect(event.request).toMatchObject({
      method: "POST",
      url: "/users/42?debug=1",
      route: "/users/:id",
      statusCode: 500,
      query: { debug: "1" },
      params: { id: "42" },
      body: { name: "Jane", password: "[REDACTED]" },
    });
    expect((event.request?.headers as Record<string, string>).authorization).toBe("[REDACTED]");
    expect(event.request?.requestId).toBe(res.headers["x-request-id"]);
    expect(event.request?.curl).toContain("curl -X POST 'http://");
    expect(event.request?.curl).not.toContain("hunter2");
    expect(event.request?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("classe les 4xx en warning", async () => {
    const { app, memory, monitor } = build();
    await request(app).get("/notfound");
    await monitor.flush();
    expect(memory.events[0]).toMatchObject({ level: "warning", request: { statusCode: 404 } });
  });

  it("réutilise un x-request-id valide et rejette les autres", async () => {
    const { app } = build();
    const ok = await request(app).get("/notfound").set("x-request-id", "abc-123");
    expect(ok.headers["x-request-id"]).toBe("abc-123");
    const bad = await request(app).get("/notfound").set("x-request-id", "a b<script>");
    expect(bad.headers["x-request-id"]).not.toBe("a b<script>");
  });
});

describe("installProcessHooks", () => {
  it("capture, vide la file puis quitte sur uncaughtException", async () => {
    const { memory, monitor } = setup();
    const exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const before = process.listeners("uncaughtException");
    const uninstall = monitor.installProcessHooks();
    const handler = process.listeners("uncaughtException").find(l => !before.includes(l))!;

    handler(new Error("fatal"), "uncaughtException");
    await monitor.flush();
    await new Promise(resolve => setImmediate(resolve));

    expect(memory.events[0]).toMatchObject({ type: "uncaughtException", level: "error" });
    expect(exit).toHaveBeenCalledWith(1);
    uninstall();
    exit.mockRestore();
  });

  it("ne quitte pas sur unhandledRejection par défaut", async () => {
    const { memory, monitor } = setup();
    const exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const before = process.listeners("unhandledRejection");
    const uninstall = monitor.installProcessHooks();
    const handler = process.listeners("unhandledRejection").find(l => !before.includes(l))!;

    handler("raison", Promise.resolve());
    await monitor.flush();

    expect(memory.events[0]).toMatchObject({ type: "unhandledRejection", message: "raison" });
    expect(exit).not.toHaveBeenCalled();
    uninstall();
    exit.mockRestore();
  });
});
