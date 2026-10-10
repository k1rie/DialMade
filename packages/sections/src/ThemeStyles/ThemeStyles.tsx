import type { CSSProperties, HTMLAttributes } from "react";
import type { TypographyPairing } from "@dialmade/catalog";
import { cx } from "../lib/cx";
import { safeThemeEntries } from "../lib/themeVars";
import type { ColorMode } from "../types";
import "./ThemeStyles.css";

export interface ThemeStylesProps extends Omit<HTMLAttributes<HTMLElement>, "style"> {
  /** Output of `compileThemeVars` for one mode (`--background`, `--dl-radius-md`…). */
  vars?: Readonly<Record<string, string>>;
  /** Its Google Fonts stylesheet is linked (`googleFontsUrl`). */
  pairing?: Pick<TypographyPairing, "googleFontsUrl"> | null;
  /** Overrides the pairing's URL; `null` links no fonts (e.g. when the <head> already does). */
  fontsHref?: string | null;
  mode?: ColorMode;
  as?: "div" | "section" | "main" | "article";
  style?: CSSProperties;
}

/** Inline style with the theme variables (unsafe names or values are dropped). */
export function themeStyle(vars: Readonly<Record<string, string>>): CSSProperties {
  return Object.fromEntries(safeThemeEntries(vars)) as CSSProperties;
}

/**
 * Container that applies the user's theme to its subtree (previews in the app, minis, export) and
 * links the fonts of the pairing. Sections and @dialmade/ui read the variables through inheritance.
 */
export function ThemeStyles({
  vars = {},
  pairing,
  fontsHref,
  mode = "light",
  as: Tag = "div",
  className,
  style,
  children,
  ...props
}: ThemeStylesProps) {
  const href = fontsHref === undefined ? pairing?.googleFontsUrl : fontsHref;
  return (
    <>
      {href ? <link rel="stylesheet" href={href} /> : null}
      <Tag
        className={cx("dl-theme", className)}
        data-dl-mode={mode}
        style={{ ...themeStyle(vars), colorScheme: mode, ...style }}
        {...props}
      >
        {children}
      </Tag>
    </>
  );
}
