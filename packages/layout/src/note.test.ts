import { describe, expect, test } from "vitest";
import { parseNote } from "./note";

describe("parseNote", () => {
  test("empty notes", () => {
    expect(parseNote(undefined)).toEqual({ keywords: [] });
    expect(parseNote("")).toEqual({ keywords: [] });
    expect(parseNote("   ")).toEqual({ keywords: [] });
  });

  test("first standalone number 1–99", () => {
    expect(parseNote("3 planes").count).toBe(3);
    expect(parseNote("cards ×4").count).toBe(4);
    expect(parseNote("x5 tarjetas").count).toBe(5);
    expect(parseNote("6x").count).toBe(6);
    expect(parseNote("× 7").count).toBe(7);
    expect(parseNote("2024 y 3 columnas").count).toBe(3);
    expect(parseNote("100 filas").count).toBeUndefined();
    expect(parseNote("0 items").count).toBeUndefined();
    expect(parseNote("99 problems").count).toBe(99);
    expect(parseNote("v2 beta").count).toBeUndefined();
    expect(parseNote("10 testimonios, 2 filas").count).toBe(10);
  });

  test("number words es/en, whichever comes first", () => {
    expect(parseNote("tres planes").count).toBe(3);
    expect(parseNote("one table").count).toBe(1);
    expect(parseNote("doce meses").count).toBe(12);
    expect(parseNote("show five items").count).toBe(5);
    expect(parseNote("twelve").count).toBe(12);
    expect(parseNote("cuatro o 6").count).toBe(4);
    expect(parseNote("6 o cuatro").count).toBe(6);
  });

  test("articles and the English «once» are not counts; the Spanish «once» is", () => {
    expect(parseNote("planes para una startup").count).toBeUndefined();
    expect(parseNote("cada una con foto y precio").count).toBeUndefined();
    expect(parseNote("un solo plan, uno destacado").count).toBeUndefined();
    expect(parseNote("updated once a day").count).toBeUndefined();
    expect(parseNote("refresh once per week, 4 metrics").count).toBe(4);
    expect(parseNote("load once").count).toBeUndefined();
    expect(parseNote("once tarjetas").count).toBe(11);
    expect(parseNote("1 plan").count).toBe(1);
  });

  test("words of Object.prototype are not numbers", () => {
    expect(parseNote("constructor de formularios").count).toBeUndefined();
  });

  test("keywords by word, accents ignored, declared order, once each", () => {
    expect(parseNote("Calendario SEMANAL").keywords).toEqual(["weekly"]);
    expect(parseNote("vista mensual y semanal, semana").keywords).toEqual(["weekly", "monthly"]);
    expect(parseNote("resumen del año").keywords).toEqual(["yearly"]);
    expect(parseNote("agenda del día").keywords).toEqual(["daily", "agenda"]);
    expect(parseNote("Buscador con búsqueda").keywords).toEqual(["search"]);
    expect(parseNote("Inicio de sesión o regístrate").keywords).toEqual(["login", "signup"]);
    expect(parseNote("sign in / sign up").keywords).toEqual(["login", "signup"]);
    expect(parseNote("log in").keywords).toEqual(["login"]);
    expect(parseNote("formulario de contacto").keywords).toEqual(["contact"]);
    expect(parseNote("imagen y texto lado a lado").keywords).toEqual(["split"]);
    expect(parseNote("side by side").keywords).toEqual(["split"]);
    expect(parseNote("slider de logos").keywords).toEqual(["carousel"]);
  });

  test("words must match whole words", () => {
    expect(parseNote("semanalmente").keywords).toEqual([]);
    expect(parseNote("mesa").keywords).toEqual([]);
    expect(parseNote("weekday").keywords).toEqual([]);
    expect(parseNote("sign").keywords).toEqual([]);
  });

  test("count and keywords together", () => {
    expect(parseNote("3 cards en carrusel")).toEqual({ count: 3, keywords: ["carousel"] });
  });
});
