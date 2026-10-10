"use client";

// @dialmade/ui and @dialmade/sections components import their own CSS (only `dl-` classes), so it loads
// with them — in the lazy design half — and never on the Home.
import "./ThemeScope.css";

import type { Locale, TypographyPairing } from "@dialmade/catalog";
import type { DesignDoc, PageKey, ScreenId } from "@dialmade/doc";
import { ThemeStyles } from "@dialmade/sections";
import { UiProvider } from "@dialmade/ui";
import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createDesignDocStore,
  selectActiveKey,
  useOptionalDesignDocStore,
  type ThemeVars,
} from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/cn";
import { deriveDesign } from "@/lib/design-derived";
import { SCREEN_ATTRIBUTE } from "@/lib/screen-layout";

export type ThemeScopeProps = Omit<HTMLAttributes<HTMLElement>, "style" | "children"> & {
  /** Default: the store's `previewMode`. */
  mode?: PreviewMode;
  /**
   * Page whose dials apply (e.g. the App page's density): a page kind or a screen id. Default: the active page
   * (`selectActiveKey`); `null` = global dials.
   */
  kind?: PageKey | null;
  /**
   * Screen rendered inside (Modo Layout): marks the subtree with `data-dl-screen`, so that screen's scoped layout
   * CSS (`scopedScreenCss` from `@/lib/screen-layout`) applies here and nowhere else. Several screens can then
   * render at once (reveal layer, thumbnails). It does not pick the dials: pass `kind` for that.
   */
  screen?: ScreenId | null;
  /** Default: the store's doc. */
  doc?: DesignDoc;
  /** Explicit variables (e.g. a live Palette Lab theme without a doc). Win over `doc`. */
  vars?: ThemeVars;
  /** Fonts to link when `vars` is given without a doc. */
  pairing?: Pick<TypographyPairing, "googleFontsUrl"> | null;
  /** Links the Google Fonts of the doc (its own families or the pairing's) or of `pairing` (default true). */
  fonts?: boolean;
  /** Locale of @dialmade/ui's internal texts. Default: the doc's `brief.locale`, else the app's. */
  locale?: Locale;
  /** Color changes interpolate in ≤400 ms (150 ms with reduced motion). Default true. */
  transition?: boolean;
  as?: "div" | "section" | "main" | "article";
  style?: CSSProperties;
  children?: ReactNode;
};

/** Outside a DesignDocProvider ThemeScope still works with explicit `doc`/`vars`. */
const detachedStore = createDesignDocStore();

/**
 * Applies the user's theme (DesignDoc → compileThemeVars) to its subtree through @dialmade/sections'
 * ThemeStyles, in light or dark. The CSS of @dialmade/ui and @dialmade/sections only loads with this
 * component and only matches `dl-` classes, so the app's `--app-*` look is untouched.
 */
export function ThemeScope({
  mode: modeProp,
  kind,
  screen,
  doc: docProp,
  vars: varsProp,
  pairing: pairingProp,
  fonts = true,
  locale: localeProp,
  transition = true,
  as,
  className,
  style,
  children,
  ...rest
}: ThemeScopeProps) {
  const store = useOptionalDesignDocStore() ?? detachedStore;
  const storeDoc = useStore(store, (state) => state.doc);
  const storeMode = useStore(store, (state) => state.previewMode);
  const activeKind = useStore(store, selectActiveKey);
  const { locale: appLocale } = useI18n();

  const doc = docProp ?? storeDoc ?? undefined;
  const mode = modeProp ?? storeMode;
  const pageKind = kind === undefined ? activeKind : kind;
  const derived = useMemo(() => (doc ? deriveDesign(doc, pageKind) : null), [doc, pageKind]);

  const vars = varsProp ?? derived?.vars[mode];
  // The doc's own imported families load too (fontsUrlFor), not only the pairing's.
  const fontsHref = !fonts ? null : pairingProp !== undefined ? (pairingProp?.googleFontsUrl ?? null) : (derived?.fontsUrl ?? null);
  const locale = localeProp ?? doc?.brief.locale ?? appLocale;

  return (
    <UiProvider locale={locale}>
      <ThemeStyles
        as={as}
        vars={vars}
        mode={mode}
        fontsHref={fontsHref}
        className={cn("app-theme-scope", className)}
        data-transition={transition ? undefined : "off"}
        style={style}
        {...(screen && { [SCREEN_ATTRIBUTE]: screen })}
        {...rest}
      >
        {children}
      </ThemeStyles>
    </UiProvider>
  );
}
