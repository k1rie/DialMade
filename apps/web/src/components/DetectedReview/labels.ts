import type { DetectionEdit } from "@dialmade/import";
import { cssVarName, type RoleKey } from "@dialmade/palette";
import type { ImportDictionary } from "@/i18n/import";
import { effectiveColor, type ChipItem } from "./model";

type Review = ImportDictionary["review"];

const number = (locale: string, max = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: max });

export const hexLabel = (hex: string) => hex.toUpperCase();

/** «Primario» for the slot roles, `card-foreground` for the rest. */
export function roleLabel(role: RoleKey, t: Review): string {
  return t.slots.names[role] ?? cssVarName(role);
}

/** The chip's value: `#3A5BD9 al 10 %`, `Inter 400 · 700`, `radio 8 px`, `h1 · 40 px / 1,1 · 600`. */
export function chipValue(item: ChipItem, edit: DetectionEdit | undefined, t: Review, locale: string): string {
  const px = (value: number) => number(locale).format(value);
  switch (item.kind) {
    case "color": {
      const eff = effectiveColor(item.color, edit);
      if (eff.alpha === undefined) return hexLabel(eff.hex);
      const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(eff.alpha);
      return `${hexLabel(eff.hex)} ${t.values.alpha(pct)}`;
    }
    case "font": {
      const family = edit?.family ?? item.font.family;
      const weights = [...new Set(item.font.weights)].sort((a, b) => a - b);
      return weights.length > 0 ? `${family} ${weights.slice(0, 3).join(" · ")}${weights.length > 3 ? "…" : ""}` : family;
    }
    case "type": {
      const { style } = item;
      const size = edit?.px ?? style.fontSize?.px;
      const parts = [style.name, size !== undefined ? `${px(size)} px` : undefined, style.lineHeight !== undefined ? number(locale).format(style.lineHeight) : undefined]
        .filter(Boolean)
        .join(" / ");
      return style.weight ? `${parts} · ${style.weight}` : parts;
    }
    case "radius": {
      const value = px(edit?.px ?? item.dim.px);
      return item.key ? t.values.radiusNamed(item.key, value) : t.values.radius(value);
    }
    case "border":
      return t.values.border(px(edit?.px ?? item.dim.px));
    case "shadow":
      return t.values.shadow(item.shadow.name, item.shadow.layers.length);
    case "space": {
      const value = px(edit?.px ?? item.dim.px);
      return item.key ? t.values.space(item.key, value) : t.values.spaceBase(value);
    }
    case "system": {
      const { component, value } = item.hint;
      const name = t.values.components[component] ?? component;
      return typeof value === "number" ? t.values.systemWeight(name, value) : t.values.systemShape(name, t.values.shapes[value] ?? value);
    }
  }
}

/** What the value is: its role (with edits), font role, scale step or kind. */
export function chipWhat(item: ChipItem, edit: DetectionEdit | undefined, t: Review): string {
  switch (item.kind) {
    case "color": {
      const eff = effectiveColor(item.color, edit);
      if (eff.role) return roleLabel(eff.role, t);
      if (item.color.scale) return t.values.scale(item.color.scale.group, item.color.scale.step);
      return item.color.name ?? t.values.unnamed;
    }
    case "font":
      return t.fontRoles[item.font.role] ?? item.font.role;
    case "type":
      return t.what.type;
    case "radius":
      return t.what.radius;
    case "border":
      return t.what.border;
    case "shadow":
      return t.what.shadow;
    case "space":
      return t.what.space;
    case "system":
      return t.what.system;
  }
}

/** Value to start the inline editor with. */
export function editorInitial(item: ChipItem, edit: DetectionEdit | undefined): string {
  switch (item.kind) {
    case "color": {
      const eff = effectiveColor(item.color, edit);
      if (eff.alpha === undefined) return hexLabel(eff.hex);
      return `${hexLabel(eff.hex)}${Math.round(eff.alpha * 255).toString(16).padStart(2, "0").toUpperCase()}`;
    }
    case "font":
      return edit?.family ?? item.font.family;
    case "type":
      return String(edit?.px ?? item.style.fontSize?.px ?? "");
    case "shadow":
    case "system":
      return "";
    default:
      return String(edit?.px ?? item.dim.px);
  }
}
