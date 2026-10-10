"use client";

import Link from "next/link";
import { useDictionary } from "@/i18n";
import { promo } from "@/i18n/promo";
import { PROMO_SCENES, promoPath } from "../../../../promo/scenes";

const linkClass = "rounded-chip px-1.5 py-0.5 text-small text-accent underline-offset-4 hover:underline";

/** `/promo` without `scene`: every scene of the manifest with links to its screen and parts. */
export function SceneIndex() {
  const t = useDictionary(promo).index;
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2 text-fg">{t.title}</h1>
        <p className="text-body text-muted">{t.description}</p>
      </header>
      <ul className="flex flex-col gap-3">
        {PROMO_SCENES.map((scene) => (
          <li key={scene.id} className="flex flex-col gap-1.5 rounded-card border border-app bg-surface/60 p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="font-mono text-mono text-fg">{scene.id}</h2>
              <Link className={linkClass} href={promoPath({ scene: scene.id })}>
                {t.screen}
              </Link>
              {scene.viewports.includes("mobile") && (
                <Link className={linkClass} href={promoPath({ scene: scene.id, viewport: "mobile" })}>
                  {t.mobile}
                </Link>
              )}
            </div>
            <p className="flex flex-wrap items-baseline gap-1.5 text-small text-muted">
              <span>{t.parts}:</span>
              {scene.parts.map((part) => (
                <Link key={part.id} className={`${linkClass} font-mono`} href={promoPath({ scene: scene.id, only: part.id, transparent: part.transparent })}>
                  {part.id}
                  {part.transparent && <span className="sr-only"> ({t.transparent})</span>}
                </Link>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
