"use client";

import { toCssVars, toDTCG, toFigmaTokens, toGlobalsCss, type Theme } from "@dialmade/palette";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDictionary } from "@/i18n";
import { palette } from "@/i18n/palette";
import { ChevronDownIcon, CopyIcon, DownloadIcon } from "../../icons";
import { downloadText, useClipboard } from "../../useClipboard";
import { ExportMenu, type ExportAction } from "./ExportMenu";

export type ExportBarProps = {
  theme: Theme;
  /** File name stem for downloads, e.g. `brisa` → `brisa.tokens.json`. */
  fileBase: string;
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * Compact palette export (as before the design half existed): CSS variables and Tailwind v4 globals are
 * copied; DTCG and Figma (light/dark) are downloaded. Inline buttons on wide screens, one menu on narrow ones.
 */
export function ExportBar({ theme, fileBase }: ExportBarProps) {
  const t = useDictionary(palette).export;
  const copy = useClipboard();
  const figmaRef = useRef<HTMLButtonElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<"figma" | "all" | null>(null);

  const download = (fileName: string, content: string) => {
    downloadText(fileName, content);
    toast.success(t.downloaded(fileName));
  };

  const css: ExportAction = { id: "css", label: t.css, hint: t.cssHint, icon: <CopyIcon />, run: () => void copy(toCssVars(theme), t.copied("CSS")) };
  const tailwind: ExportAction = {
    id: "tailwind",
    label: t.tailwind,
    hint: t.tailwindHint,
    icon: <CopyIcon />,
    run: () => void copy(toGlobalsCss(theme), t.copied("globals.css")),
  };
  const dtcg: ExportAction = {
    id: "dtcg",
    label: t.dtcg,
    hint: t.dtcgHint,
    icon: <DownloadIcon />,
    run: () => download(`${fileBase}.tokens.json`, json(toDTCG(theme))),
  };
  const figma: ExportAction[] = (["light", "dark"] as const).map((mode) => ({
    id: `figma-${mode}`,
    label: mode === "light" ? t.figmaLight : t.figmaDark,
    hint: t.figmaHint,
    icon: <DownloadIcon />,
    run: () => download(`${fileBase}-figma-${mode}.tokens.json`, json(toFigmaTokens(theme, mode))),
  }));

  const close = (restoreFocus: boolean) => {
    const trigger = menu === "figma" ? figmaRef.current : allRef.current;
    setMenu(null);
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  };

  return (
    <>
      <div role="group" aria-label={t.menu} className="hidden items-center gap-0.5 lg:flex">
        <span className="mr-1 text-caption text-muted">{t.label}</span>
        {[css, tailwind, dtcg].map((action) => (
          <Tooltip key={action.id} content={action.hint}>
            <Button variant="ghost" size="sm" className="px-2" onClick={action.run}>
              {action.label}
            </Button>
          </Tooltip>
        ))}
        <Button
          ref={figmaRef}
          variant="ghost"
          size="sm"
          className="px-2"
          aria-haspopup="menu"
          aria-expanded={menu === "figma"}
          trailingIcon={<ChevronDownIcon />}
          onClick={() => setMenu((open) => (open === "figma" ? null : "figma"))}
        >
          {t.figma}
        </Button>
      </div>
      <Button
        ref={allRef}
        variant="ghost"
        size="sm"
        className="lg:hidden"
        aria-haspopup="menu"
        aria-expanded={menu === "all"}
        leadingIcon={<DownloadIcon />}
        trailingIcon={<ChevronDownIcon />}
        onClick={() => setMenu((open) => (open === "all" ? null : "all"))}
      >
        {t.label}
      </Button>
      <ExportMenu open={menu === "figma"} onClose={close} anchorRef={figmaRef} label={t.figma} actions={figma} />
      <ExportMenu open={menu === "all"} onClose={close} anchorRef={allRef} label={t.menu} actions={[css, tailwind, dtcg, ...figma]} />
    </>
  );
}
