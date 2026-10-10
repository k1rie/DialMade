import { ROUTE_MAX } from "@dialmade/doc";
import type { ScreenId } from "@dialmade/layout";

/*
 * «Ruta» of the screen panel. The store validates again in `setRoute`; this module lets the field explain
 * the problem while the user types and fix the obvious (a missing leading slash). Pure, no DOM.
 */

export { ROUTE_MAX };

/** «/», or slug segments: `/precios`, `/app/ajustes-2`, at most `ROUTE_MAX` characters. The store's rule (`setRoute`). */
export const ROUTE_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;

export type RouteProblem = "invalid" | "taken";
export type RouteCheck = { ok: true; route: string } | { ok: false; reason: RouteProblem };

/**
 * What the store would save for what the user typed: trimmed, lowercase, with a leading «/» and without a
 * trailing one. «precios» → «/precios», « /Precios/ » → «/precios».
 */
export function normalizeRoute(raw: string): string {
  let route = raw.trim().toLowerCase();
  if (!route.startsWith("/")) route = `/${route}`;
  if (route.length > 1) route = route.replace(/\/+$/, "");
  return route || "/";
}

/** Whether the typed route can be saved for `screenId`: valid shape and not used by another screen. */
export function checkRoute(raw: string, screenId: ScreenId, screens: readonly { id: ScreenId; route: string }[]): RouteCheck {
  const route = normalizeRoute(raw);
  if (raw.trim() === "" || route.length > ROUTE_MAX || !ROUTE_PATTERN.test(route)) return { ok: false, reason: "invalid" };
  if (screens.some((screen) => screen.id !== screenId && screen.route === route)) return { ok: false, reason: "taken" };
  return { ok: true, route };
}
