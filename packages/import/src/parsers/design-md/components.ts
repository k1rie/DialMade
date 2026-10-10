import type { RoleKey } from "@dialmade/palette";
import { isJsonObject, own, type JsonObject, type JsonValue } from "../../sanitize";
import type { ParsedColor, ProvInput, SystemHint as SystemHintValue } from "../../types";
import { aliasPath, type Resolved } from "../tokens/alias";
import { colorToCss, dimOf, fontWeightOf } from "../tokens/values";

/** A DesignDoc `system` value a DESIGN.md component implies (`/system/button/shape`). */
export type SystemHint = SystemHintValue & ProvInput;

interface Options {
  resolve: (value: JsonValue) => Resolved;
  locator: (path: readonly string[]) => string;
  /** Colors already read from `colors` (named `colors.<key>`); roles may be added to them. */
  colors: ParsedColor[];
}

/** Which color property of which component names a role. */
const COMPONENT_ROLES: readonly [RegExp, Readonly<Record<string, RoleKey>>][] = [
  [/^(?:button|btn)(?:-primary)?$|^primary-button$/, { backgroundColor: "primary", textColor: "primaryForeground" }],
  [/^(?:button|btn)-secondary$|^secondary-button$/, { backgroundColor: "secondary", textColor: "secondaryForeground" }],
  [/^(?:button|btn)-(?:cta|accent)$|^cta$/, { backgroundColor: "cta", textColor: "ctaForeground" }],
  [/^(?:button|btn)-(?:destructive|danger)$/, { backgroundColor: "destructive", textColor: "destructiveForeground" }],
  [/^card$/, { backgroundColor: "card", textColor: "cardForeground" }],
  [/^popover$/, { backgroundColor: "popover", textColor: "popoverForeground" }],
  [/^(?:page|body|app|background)$/, { backgroundColor: "background", textColor: "foreground" }],
  [/^input$/, { borderColor: "input" }],
];
const BUTTON = /^(?:button|btn)(?:-primary)?$|^primary-button$/;

const prov = (locator: string): ProvInput => ({ locator, confidence: "medium", method: "declared" });

function shapeOf(radius: JsonValue | undefined, height: JsonValue | undefined, resolve: Options["resolve"]): SystemHint["value"] | undefined {
  const r = radius === undefined ? null : resolve(radius);
  const px = r?.ok ? dimOf(r.value, { bareIsPx: true })?.px : undefined;
  if (px === undefined) return undefined;
  const h = height === undefined ? null : resolve(height);
  const heightPx = h?.ok ? dimOf(h.value, { bareIsPx: true })?.px : undefined;
  if (px === 0) return "square";
  return px >= 999 || (heightPx !== undefined && px * 2 >= heightPx) ? "pill" : "rounded";
}

/**
 * `components` → roles and `system` hints. A component's color names a role only when no color has
 * it yet: a reference to a color without a role (`{colors.ocean}`) gives it the role; otherwise the
 * value comes in as a new color with that role.
 * Confidence is «medium»: the component names are free-form.
 */
export function componentHints(components: JsonObject, options: Options): { colors: ParsedColor[]; system: SystemHint[]; unresolved: { path: string; reason: string }[] } {
  const added: ParsedColor[] = [];
  const system: SystemHint[] = [];
  const unresolved: { path: string; reason: string }[] = [];
  const taken = new Set(options.colors.flatMap((c) => (c.role ? [c.role] : [])));
  const names = Object.keys(components).slice(0, 200);

  for (const name of names) {
    const props = components[name]!;
    if (!isJsonObject(props)) continue;
    const key = name.toLowerCase();
    const roles = COMPONENT_ROLES.find(([re]) => re.test(key))?.[1];
    if (!roles) continue;
    for (const [prop, role] of Object.entries(roles)) {
      const raw = own(props, prop);
      if (raw === undefined || taken.has(role)) continue;
      const path = ["components", name, prop];
      const ref = aliasPath(raw);
      const target = ref ? options.colors.find((c) => c.name === ref && !c.role) : undefined;
      if (target) {
        target.role = role;
        target.confidence = "medium";
        taken.add(role);
        continue;
      }
      const resolved = options.resolve(raw);
      if (!resolved.ok) {
        unresolved.push({ path: options.locator(path), reason: resolved.reason });
        continue;
      }
      const value = colorToCss(resolved.value);
      if (!value) continue;
      added.push({ name: path.join("."), value, role, ...prov(options.locator(path)) });
      taken.add(role);
    }
  }

  const button = names.find((n) => BUTTON.test(n.toLowerCase())) ?? names.find((n) => n.toLowerCase().startsWith("button"));
  const shapes: [SystemHint["component"], string | undefined][] = [
    ["button", button],
    ["input", names.find((n) => n.toLowerCase() === "input")],
    ["badge", names.find((n) => n.toLowerCase() === "badge")],
  ];
  for (const [component, name] of shapes) {
    const props = name ? components[name] : undefined;
    if (!name || !isJsonObject(props)) continue;
    const shape = shapeOf(own(props, "rounded"), own(props, "height"), options.resolve);
    if (shape) system.push({ component, key: "shape", value: shape, ...prov(options.locator(["components", name, "rounded"])) });
    if (component !== "button") continue;
    const typography = own(props, "typography");
    const resolved = typography === undefined ? null : options.resolve(typography);
    const weightRaw = resolved?.ok && isJsonObject(resolved.value) ? own(resolved.value, "fontWeight") : undefined;
    const weight = weightRaw === undefined ? null : fontWeightOf(weightRaw);
    if (weight !== null) {
      const rounded = Math.min(900, Math.max(100, Math.round(weight / 100) * 100));
      system.push({ component, key: "weight", value: rounded, ...prov(options.locator(["components", name, "typography"])) });
    }
  }
  return { colors: added, system, unresolved };
}
