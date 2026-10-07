import { PACKAGE_NAME } from "../src";

describe("@naomis/error-handler", () => {
  it("exporte le nom du package", () => {
    expect(PACKAGE_NAME).toBe("@naomis/error-handler");
  });
});
