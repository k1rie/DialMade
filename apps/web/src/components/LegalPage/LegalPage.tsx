"use client";

// /privacy and /terms: plain reading pages in the app's style, in the active locale.
import Link from "next/link";
import { useId } from "react";
import { useDictionary } from "@/i18n";
import { legalText } from "@/i18n/legal";

export function LegalPage({ document }: { document: "privacy" | "terms" }) {
  const t = useDictionary(legalText);
  const doc = t[document];
  const titleId = useId();
  return (
    <main id="main" aria-labelledby={titleId} className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 id={titleId} className="m-0 text-h1">
          {doc.title}
        </h1>
        <p className="m-0 text-caption text-subtle">{t.updated}</p>
        <p className="m-0 text-body text-muted">{doc.summary}</p>
      </header>
      {doc.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="m-0 text-h3">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="m-0 text-body text-muted">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <nav aria-label={t.links.home} className="flex flex-wrap gap-4 border-t border-app pt-6 text-small">
        <Link href="/" className="text-accent underline-offset-4 hover:underline">
          {t.links.home}
        </Link>
        <Link href={document === "privacy" ? "/terms" : "/privacy"} className="text-muted underline-offset-4 hover:text-fg hover:underline">
          {document === "privacy" ? t.links.terms : t.links.privacy}
        </Link>
      </nav>
    </main>
  );
}
