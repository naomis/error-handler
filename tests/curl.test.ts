import { buildCurl } from "../src";

describe("buildCurl", () => {
  it("génère une commande rejouable en échappant les quotes", () => {
    const cmd = buildCurl({
      method: "post",
      url: "http://localhost:3000/api/x?a=1",
      headers: { "content-type": "application/json", host: "localhost", "content-length": "10" },
      body: { name: "l'été" },
    });
    expect(cmd).toBe(
      `curl -X POST 'http://localhost:3000/api/x?a=1' -H 'content-type: application/json' --data-raw '{"name":"l'\\''été"}'`,
    );
  });

  it("omet le body vide", () => {
    expect(buildCurl({ method: "GET", url: "http://x/y", body: {} })).toBe("curl -X GET 'http://x/y'");
  });
});

import { inferParams } from "../src/core/params";

describe("inferParams", () => {
  it("reconstruit les paramètres depuis le pattern de route", () => {
    expect(inferParams("/users/:id/docs/:docId", "/api/users/42/docs/a%20b?x=1")).toEqual({ id: "42", docId: "a b" });
  });
  it("retourne undefined sans paramètres ou sans correspondance", () => {
    expect(inferParams("/users", "/users")).toBeUndefined();
    expect(inferParams("/users/:id", "/other/1")).toBeUndefined();
  });
});
