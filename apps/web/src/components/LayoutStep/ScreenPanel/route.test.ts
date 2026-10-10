import { describe, expect, it } from "vitest";
import { checkRoute, normalizeRoute, ROUTE_PATTERN } from "./route";

const screens = [
  { id: "s-home", route: "/" },
  { id: "s-pricing", route: "/precios" },
  { id: "s-settings", route: "/app/ajustes" },
];

describe("normalizeRoute", () => {
  it("trims, lowercases and adds the leading slash", () => {
    expect(normalizeRoute("precios")).toBe("/precios");
    expect(normalizeRoute("  /Precios ")).toBe("/precios");
    expect(normalizeRoute("app/Ajustes")).toBe("/app/ajustes");
  });

  it("drops trailing slashes but keeps the root", () => {
    expect(normalizeRoute("/precios/")).toBe("/precios");
    expect(normalizeRoute("/precios///")).toBe("/precios");
    expect(normalizeRoute("/")).toBe("/");
    expect(normalizeRoute("///")).toBe("/");
    expect(normalizeRoute("")).toBe("/");
  });
});

describe("ROUTE_PATTERN", () => {
  it("accepts the root and slug segments", () => {
    for (const route of ["/", "/precios", "/app/ajustes-2", "/a1/b2/c3"]) expect(ROUTE_PATTERN.test(route), route).toBe(true);
  });

  it("refuses spaces, accents, doubled or edge hyphens and empty segments", () => {
    for (const route of ["/mis precios", "/configuración", "/a--b", "/-a", "/a-", "/a//b", "precios", "/a?b=1", "/a#b"]) {
      expect(ROUTE_PATTERN.test(route), route).toBe(false);
    }
  });
});

describe("checkRoute", () => {
  it("accepts a free route, normalized", () => {
    expect(checkRoute("Contacto", "s-pricing", screens)).toEqual({ ok: true, route: "/contacto" });
    expect(checkRoute("/app/perfil/", "s-pricing", screens)).toEqual({ ok: true, route: "/app/perfil" });
  });

  it("accepts the screen's own route", () => {
    expect(checkRoute("/precios", "s-pricing", screens)).toEqual({ ok: true, route: "/precios" });
  });

  it("refuses a route another screen uses", () => {
    expect(checkRoute("/", "s-pricing", screens)).toEqual({ ok: false, reason: "taken" });
    expect(checkRoute("APP/ajustes/", "s-pricing", screens)).toEqual({ ok: false, reason: "taken" });
  });

  it("refuses an empty or malformed route", () => {
    expect(checkRoute("", "s-pricing", screens)).toEqual({ ok: false, reason: "invalid" });
    expect(checkRoute("   ", "s-pricing", screens)).toEqual({ ok: false, reason: "invalid" });
    expect(checkRoute("/mis precios", "s-pricing", screens)).toEqual({ ok: false, reason: "invalid" });
    expect(checkRoute("/precios-", "s-pricing", screens)).toEqual({ ok: false, reason: "invalid" });
  });
});
