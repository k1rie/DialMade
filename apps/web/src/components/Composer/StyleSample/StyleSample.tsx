"use client";

import { memo, type CSSProperties } from "react";
import { ThemeScope } from "@/components/ThemeScope";
import type { ThemeVars } from "@/hooks/useDesignDoc";
import type { PreviewMode } from "@/hooks/usePaletteFlow";
import { cn } from "@/lib/cn";

export type StyleSampleProps = {
  /** Sample variables (see `sampleVars`): the user's colors with the card's recipe and fonts. */
  vars: ThemeVars;
  mode: PreviewMode;
  /** "theme": vertical Buffer-style card; "recipe": a card and a button side by side. */
  layout: "theme" | "recipe";
  buttonLabel?: string;
  className?: string;
};

// Real component tokens, shrunk: radii scale down so a 60 px card keeps the recipe's character.
const card: CSSProperties = {
  background: "var(--card)",
  border: "var(--dl-card-border, 1px solid var(--border))",
  boxShadow: "var(--dl-card-shadow, none)",
  borderRadius: "calc(var(--dl-card-radius, 8px) * 0.45)",
};
const button: CSSProperties = {
  background: "var(--primary)",
  color: "var(--primary-foreground)",
  boxShadow: "var(--dl-button-shadow, none)",
  borderRadius: "calc(var(--dl-button-radius, 6px) * 0.5)",
  fontWeight: "var(--dl-button-weight, 600)" as CSSProperties["fontWeight"],
};
const heading: CSSProperties = {
  fontFamily: "var(--dl-font-heading, inherit)",
  fontWeight: "var(--dl-heading-weight, 600)" as CSSProperties["fontWeight"],
  letterSpacing: "var(--dl-heading-tracking, normal)",
  color: "var(--foreground)",
  lineHeight: 1,
};
const line = (width: string, color: string, opacity = 1): CSSProperties => ({
  display: "block",
  height: 3,
  width,
  borderRadius: 2,
  background: color,
  opacity,
});

/** Mini specimen painted inside ThemeScope with the user's theme: decorative (aria-hidden). */
export const StyleSample = memo(function StyleSample({ vars, mode, layout, buttonLabel, className }: StyleSampleProps) {
  return (
    <ThemeScope vars={vars} mode={mode} kind={null} fonts={false} aria-hidden className={cn("h-full w-full overflow-hidden", className)}>
      {layout === "theme" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, height: "100%", padding: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
            <span style={{ ...heading, fontSize: 14 }}>Aa</span>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--brand)" }} />
          </div>
          <span style={{ ...button, display: "block", height: 8, flexShrink: 0 }} />
          <div style={{ ...card, flex: 1, display: "flex", flexDirection: "column", gap: 3, padding: 5, minHeight: 0 }}>
            <span style={line("72%", "var(--card-foreground, var(--foreground))", 0.6)} />
            <span style={line("48%", "var(--muted-foreground)", 0.6)} />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: "100%", padding: "8px 10px" }}>
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 4, padding: "7px 8px", width: "52%" }}>
            <span style={{ ...heading, fontSize: 13 }}>Aa</span>
            <span style={line("80%", "var(--muted-foreground)", 0.55)} />
            <span style={line("55%", "var(--muted-foreground)", 0.4)} />
          </div>
          <span style={{ ...button, padding: "4px 8px", fontSize: 10, lineHeight: 1.2, fontFamily: "var(--dl-font-body, inherit)", whiteSpace: "nowrap" }}>
            {buttonLabel}
          </span>
        </div>
      )}
    </ThemeScope>
  );
});
