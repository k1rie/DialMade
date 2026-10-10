import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { AiCopyTrigger } from "./AiCopyTrigger";

// The real tooltip renders its bubble in a portal on the client only: this one prints its props.
vi.mock("@/components/ui/Tooltip", () => ({
  Tooltip: ({ content, disabled, children }: { content: ReactNode; disabled?: boolean; children: ReactElement }) =>
    createElement("span", { "data-tooltip": String(content), "data-tooltip-disabled": String(!!disabled) }, children),
}));

const render = (mode: "off" | "copy" | "design", open = false) =>
  renderToStaticMarkup(
    createElement(
      I18nProvider,
      null,
      createElement(AiCopyTrigger, { mode, open, "aria-expanded": open, "aria-haspopup": "dialog", "aria-controls": undefined, onClick: () => {} }),
    ),
  );

/** Text of the button without its tags (its accessible name: the icons are aria-hidden). */
const buttonText = (markup: string) => (/<button[^>]*>([\s\S]*)<\/button>/.exec(markup)?.[1] ?? "").replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "");

describe("AiCopyTrigger", () => {
  it("has a tooltip with the button's own name, so the icon-only state says what it is and what the AI does", () => {
    const expected = { off: "IA, sin IA", copy: "IA, textos con IA", design: "IA, diseño con IA" } as const;
    for (const mode of ["off", "copy", "design"] as const) {
      const markup = render(mode);
      const tooltip = /data-tooltip="([^"]*)"/.exec(markup)?.[1];
      expect(tooltip).toBe(expected[mode]);
      // Same words as the name: a description equal to the name is not read twice.
      expect(buttonText(markup)).toBe(tooltip);
      expect(markup).toMatch(/<span data-tooltip="[^"]*" data-tooltip-disabled="false"><button/);
    }
  });

  it("no tooltip while its popover is open (the popover covers that spot)", () => {
    expect(render("off", true)).toContain('data-tooltip-disabled="true"');
  });

  it("keeps the popover trigger props on the button", () => {
    const button = /<button[^>]*>/.exec(render("design", true))?.[0] ?? "";
    expect(button).toContain('aria-expanded="true"');
    expect(button).toContain('aria-haspopup="dialog"');
  });
});
