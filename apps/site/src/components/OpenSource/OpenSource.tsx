import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { landing, type Locale } from "@/i18n";
import { REPO_URL } from "@/lib/links";
import { BlueprintCorners } from "./BlueprintCorners";
import { CopyCommands } from "./CopyCommands";

const commands = [`git clone ${REPO_URL}.git`, "cd DialMade && corepack enable pnpm", "pnpm install && pnpm dev"];

export function OpenSource({ locale }: { locale: Locale }) {
  const t = landing[locale].oss;
  return (
    <section id="open-source" aria-labelledby="oss-title" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6 md:py-28">
      <Reveal className="relative grid grid-cols-1 rounded-panel border border-app bg-app-elevated/50 md:grid-cols-2">
        <BlueprintCorners />
        <div className="flex flex-col gap-8 p-6 sm:p-10">
          <SectionHeading id="oss-title" eyebrow={t.eyebrow} title={t.title} subtitle={t.body} />
          <ul className="grid gap-3 sm:grid-cols-2">
            {t.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-small text-muted">
                <svg aria-hidden viewBox="0 0 16 16" fill="none" className="mt-px size-4 shrink-0 text-success">
                  <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
          <ButtonLink href={REPO_URL} variant="secondary" size="lg" className="self-start">
            {t.star}
          </ButtonLink>
        </div>
        <div className="flex items-center border-t border-dashed border-app-strong p-6 sm:p-10 md:border-t-0 md:border-l">
          <div className="w-full overflow-hidden rounded-card border border-app-strong bg-app shadow-lift">
            <div className="flex h-10 items-center gap-3 border-b border-app px-3">
              <span aria-hidden className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
              </span>
              {/* Window chrome, like the dots. */}
              <span aria-hidden className="font-mono text-caption text-subtle">
                {t.terminal}
              </span>
              <CopyCommands text={commands.join("\n")} copy={t.copy} copied={t.copied} copyFailed={t.copyFailed} />
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-fg/90">
              {commands.map((cmd) => (
                <span key={cmd} className="block whitespace-pre">
                  <span aria-hidden className="text-accent select-none">$ </span>
                  {cmd}
                </span>
              ))}
              {/* A real requirement (Node 24+), so it gets readable contrast; the dimmer tone marks it as a comment. */}
              <span className="block text-muted"># MIT · Node 24+</span>
            </pre>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
