"use client";

import { renderableBlocks } from "@dialmade/ai-render";
import { getStyleRecipe } from "@dialmade/catalog";
import type { DesignDoc } from "@dialmade/doc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { Segmented } from "@/components/ui/Segmented";
import { useAiBlockActions } from "@/hooks/useAiBlockEdit";
import { useDesignDocStore } from "@/hooks/useDesignDoc";
import { useDictionary, useI18n } from "@/i18n";
import { composer } from "@/i18n/composer";
import { byokBlockActionsCost } from "@/lib/ai/render/blockAction";
import { formatRange } from "@/lib/ai/render/costLine";
import { actionsLeft, useLiveSession } from "@/lib/ai/render/liveSession";
import { setScreenView, useAiView, type AiView } from "@/lib/ai/render/view";
import { cn } from "@/lib/cn";
import type { PageTarget } from "../../pageOps";
import { sectionInfo } from "../../sectionInfo";
import { affordable, redoPlan } from "./redoPlan";

export type AiScreenBarProps = {
  doc: DesignDoc;
  target: PageTarget;
  className?: string;
};

/**
 * «Diseño con IA» in the Composer's top bar (spec §8.2): «Base | IA» for the whole screen (one state visible at a
 * time, keyboard radio group) and, when the style recipe changed or blocks are «Desactualizado», the notice «El
 * estilo cambió · ¿Rehacer con IA?» with what it costs before anything runs. Nothing is ever redone on its own.
 * Renders nothing on a screen without active AI blocks. With the user's key (BYOK) no session is needed: it redoes
 * every block and says what that costs with the key.
 */
export function AiScreenBar({ doc, target, className }: AiScreenBarProps) {
  const { locale } = useI18n();
  const t = useDictionary(composer).aiBlock;
  const store = useDesignDocStore();
  const session = useLiveSession();
  const blockActions = useAiBlockActions();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<{ i: number; n: number } | null>(null);
  const screen = target.screen;
  const screenId = screen?.id ?? null;
  const view: AiView = useAiView((state) => (screenId && state.baseScreens[screenId] ? "base" : "ai"));

  const order = useMemo(() => (screen ? renderableBlocks(screen) : []), [screen]);
  const plan = useMemo(() => (screenId ? redoPlan(doc, screenId, order) : null), [doc, screenId, order]);
  const activeCount = screen ? Object.values(screen.aiRender?.blocks ?? {}).filter((block) => block.active).length : 0;
  if (!screen || !screenId || !plan || activeCount === 0) return null;

  const byok = !blockActions.transport.usesSession;
  const left = session ? actionsLeft(session.counters) : 0;
  // Without a session the button says what a redo would cover; it runs once a session is open. BYOK: all of them.
  const todo = !byok && session ? affordable(plan.all, left) : plan.all;
  const byokCost = byok && open ? byokBlockActionsCost(doc, screenId, todo, blockActions.transport.model) : null;
  const label = (id: string) => sectionInfo(screen.page, id, locale, screen).label;

  const redo = async () => {
    let done = 0;
    let failed = 0;
    for (const [index, id] of todo.entries()) {
      setProgress({ i: index + 1, n: todo.length });
      const ok = await blockActions.run(screenId, id, label(id), { kind: "reroll" }, { quiet: true });
      if (ok) done += 1;
      else failed += 1;
      // The session may have run out (or the document changed under us): stop at the first hard failure.
      if (!ok && !store.getState().doc?.screens[screenId]) break;
    }
    setProgress(null);
    setOpen(false);
    if (done > 0) toast.success(t.screen.redone(done, failed));
  };

  const notice = plan.styleChanged.length > 0 ? t.screen.styleChanged : plan.stale.length > 0 ? t.screen.stale(plan.stale.length) : null;
  const recipeOfChanged = plan.styleChanged[0] ? (screen.aiRender?.blocks[plan.styleChanged[0]]?.provenance.recipeId ?? "") : "";

  return (
    <div role="group" aria-label={t.screen.label} className={cn("flex items-center gap-1.5", className)}>
      <span className="text-caption text-muted max-lg:sr-only">{t.screen.count(activeCount)}</span>
      <Segmented<AiView>
        label={t.compare.label}
        layoutId="composer-ai-screen"
        size="sm"
        value={view}
        onChange={(next) => setScreenView(screenId, next)}
        options={[
          { value: "base", label: t.compare.base },
          { value: "ai", label: t.compare.ai },
        ]}
      />
      {notice && (
        <Popover
          open={open}
          onOpenChange={(next) => !progress && setOpen(next)}
          label={notice}
          align="end"
          className="w-80"
          trigger={(triggerProps) => (
            <Button size="sm" variant="secondary" className="h-7 border-[color-mix(in_oklch,var(--app-warning)_45%,transparent)] px-2.5 text-caption" {...triggerProps}>
              <span aria-hidden className="size-1.5 rounded-full bg-warning" />
              {notice}
            </Button>
          )}
        >
          <div className="flex flex-col gap-2.5 text-caption">
            <p className="text-small font-semibold text-fg">{notice}</p>
            {plan.styleChanged.length > 0 && (
              <p className="text-muted">{t.screen.styleBody(plan.styleChanged.length, getStyleRecipe(recipeOfChanged)?.label[locale] ?? recipeOfChanged)}</p>
            )}
            {plan.stale.length > 0 && <p className="text-muted">{t.screen.staleBody(plan.stale.length)}</p>}
            {byok ? (
              byokCost && <p className="text-subtle">{t.cost.byok(formatRange(byokCost, locale))}</p>
            ) : session ? (
              <p className="text-subtle">
                {t.screen.redoCost(todo.length, left)}
                {todo.length < plan.all.length && ` · ${t.screen.notEnough(left)}`}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="text-fg">{t.cost.none}</p>
                <p className="text-muted">{t.cost.openHint}</p>
                <Button size="sm" variant="secondary" className="self-start" loading={blockActions.opening} onClick={() => void blockActions.openSession()}>
                  {t.cost.open}
                </Button>
              </div>
            )}
            <p role="status" aria-live="polite" className={progress ? "text-fg" : "sr-only"}>
              {progress ? t.screen.redoing(progress.i, progress.n) : ""}
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" disabled={progress !== null} onClick={() => setOpen(false)}>
                {t.screen.notNow}
              </Button>
              <Button size="sm" variant="primary" disabled={(blockActions.transport.usesSession && !session) || todo.length === 0} loading={progress !== null} onClick={() => void redo()}>
                {t.screen.redoN(todo.length)}
              </Button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}
