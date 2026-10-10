"use client";

// «Mis diseños» (refs. 10A Magnific + 10C Replit): a slim sidebar, «Recientes» with a «Nuevo diseño» card
// and gradient cards of each palette, then a clean grid (or list) with search and sort. Signed out, it asks
// to sign in (modal); with accounts off, it says so. The server checks the owner on every call.
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useDeferredValue, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useDictionary, useI18n } from "@/i18n";
import { authText } from "@/i18n/auth";
import { designsApi, type DesignSummary } from "@/lib/designs/client";
import { stageVariants, tween } from "@/lib/motion";
import { ConfirmDelete } from "./ConfirmDelete";
import { DesignCard } from "./DesignCard";
import { FolderIcon, GridIcon, ListIcon, PlusIcon, SearchIcon } from "./icons";
import { NewDesignCard } from "./NewDesignCard";
import { useDesignsList } from "./useDesignsList";

const RECENT_COUNT = 3;

export function DesignsGallery() {
  const text = useDictionary(authText);
  const t = text.designs;
  const { t: common } = useI18n();
  const { availability, user, loading, openLogin } = useAuth();
  const titleId = useId();
  const searchId = useId();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim());
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<DesignSummary | null>(null);
  const list = useDesignsList(user?.id ?? null, query, sort);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } catch {
      toast.error(t.failed);
    } finally {
      setBusyId(null);
    }
  };

  const rename = (design: DesignSummary, name: string) =>
    run(design.id, async () => {
      const updated = await designsApi.update(design.id, { name });
      list.update((items) => items.map((item) => (item.id === design.id ? updated : item)));
      toast.success(t.renamed);
    });

  const duplicate = (design: DesignSummary) =>
    run(design.id, async () => {
      const copy = await designsApi.duplicate(design.id, t.copyName(design.name));
      list.update((items) => [copy, ...items]);
      toast.success(t.duplicated(copy.name));
    });

  const confirmDelete = () => {
    const design = toDelete;
    setToDelete(null);
    if (!design) return;
    void run(design.id, async () => {
      await designsApi.remove(design.id);
      list.update((items) => items.filter((item) => item.id !== design.id));
      toast(t.deleted(design.name));
    });
  };

  const card = (design: DesignSummary, layout: "grid" | "list") => (
    <DesignCard
      key={design.id}
      design={design}
      view={layout}
      busy={busyId === design.id}
      onRename={(name) => void rename(design, name)}
      onDuplicate={() => void duplicate(design)}
      onDelete={() => setToDelete(design)}
    />
  );

  let body: ReactNode;
  if (!availability.enabled) {
    body = <Notice text={t.authOff} />;
  } else if (loading || (user && list.status === "loading" && list.designs.length === 0)) {
    body = <SkeletonGrid label={t.loading} />;
  } else if (!user) {
    body = (
      <Notice text={t.signInPrompt}>
        <Button variant="primary" onClick={() => openLogin({ reason: "designs", callbackPath: "/designs" })}>
          {text.account.signIn}
        </Button>
      </Notice>
    );
  } else if (list.status === "error") {
    body = (
      <Notice text={t.loadFailed}>
        <Button onClick={list.reload}>{common.actions.retry}</Button>
      </Notice>
    );
  } else {
    const { designs } = list;
    const showRecents = !query && sort === "recent" && designs.length > 0;
    body = (
      <LayoutGroup>
        {showRecents && (
          <section aria-labelledby={`${titleId}-recents`} className="flex flex-col gap-3">
            <h2 id={`${titleId}-recents`} className="m-0 text-small font-medium text-muted">
              {t.recents}
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              <NewDesignCard />
              {designs.slice(0, RECENT_COUNT).map((design) => card(design, "grid"))}
            </ul>
          </section>
        )}

        <section aria-labelledby={`${titleId}-all`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`${titleId}-all`} className="m-0 mr-auto text-small font-medium text-muted">
              {t.all} <span className="text-subtle">· {t.count(designs.length)}</span>
            </h2>
            <div className="relative w-full sm:w-64">
              <label htmlFor={searchId} className="sr-only">
                {t.searchLabel}
              </label>
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-subtle [&_svg]:size-4">
                <SearchIcon />
              </span>
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-8 w-full rounded-control border border-app-strong bg-app pr-3 pl-8 text-small text-fg placeholder:text-subtle focus-visible:border-accent"
              />
            </div>
            <Segmented
              label={t.sortLabel}
              value={sort}
              onChange={setSort}
              layoutId={`${titleId}-sort`}
              size="sm"
              options={[
                { value: "recent", label: t.sortRecent },
                { value: "name", label: t.sortName },
              ]}
            />
            <Segmented
              label={t.viewLabel}
              value={view}
              onChange={setView}
              layoutId={`${titleId}-view`}
              size="sm"
              options={[
                { value: "grid", label: t.viewGrid, icon: <GridIcon />, iconOnly: true },
                { value: "list", label: t.viewList, icon: <ListIcon />, iconOnly: true },
              ]}
            />
          </div>

          <AnimatePresence mode="popLayout" initial={false}>
            {designs.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tween(0.2)}>
                {query ? (
                  <Notice text={t.noResults(query)} />
                ) : (
                  <Notice text={t.empty} hint={t.emptyHint}>
                    <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-control bg-accent-cta px-4 text-[0.875rem] font-medium text-white glow-purple [&_svg]:size-4">
                      <PlusIcon />
                      {t.newDesign}
                    </Link>
                  </Notice>
                )}
              </motion.div>
            ) : (
              <motion.ul
                key={view}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={tween(0.2)}
                aria-busy={list.status === "loading" || undefined}
                className={view === "grid" ? "m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" : "m-0 flex list-none flex-col gap-2 p-0"}
              >
                {designs.map((design) => card(design, view))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      </LayoutGroup>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 pt-4 pb-12 sm:px-6">
      <aside className="hidden w-52 shrink-0 lg:block">
        <nav aria-label={t.nav} className="sticky top-4 flex flex-col gap-1">
          <Link href="/designs" aria-current="page" className="flex h-9 items-center gap-2 rounded-control bg-white/[0.06] px-3 text-small font-medium text-fg [&_svg]:size-4">
            <FolderIcon />
            {t.title}
          </Link>
          <Link href="/" className="flex h-9 items-center gap-2 rounded-control px-3 text-small text-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-fg [&_svg]:size-4">
            <PlusIcon />
            {t.newDesign}
          </Link>
          {user?.isAnonymous && <p className="m-0 mt-4 rounded-card border border-app bg-white/[0.03] p-3 text-caption text-muted">{t.guestNotice}</p>}
        </nav>
      </aside>

      <motion.main id="main" aria-labelledby={titleId} variants={stageVariants} initial="initial" animate="animate" className="flex min-w-0 flex-1 flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 id={titleId} className="m-0 text-h1">
            {t.title}
          </h1>
          {user && (
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-control border border-app-strong bg-surface px-4 text-[0.875rem] text-fg shadow-surface transition-colors duration-150 hover:bg-surface-hover lg:hidden [&_svg]:size-4">
              <PlusIcon />
              {t.newDesign}
            </Link>
          )}
        </header>
        {user?.isAnonymous && <p className="m-0 rounded-card border border-app bg-white/[0.03] p-3 text-small text-muted lg:hidden">{t.guestNotice}</p>}
        {body}
      </motion.main>

      <ConfirmDelete name={toDelete?.name ?? null} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
}

function Notice({ text, hint, children }: { text: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-app bg-white/[0.02] px-6 py-14 text-center" role="status">
      <p className="m-0 text-body text-fg">{text}</p>
      {hint && <p className="m-0 text-small text-muted">{hint}</p>}
      {children}
    </div>
  );
}

function SkeletonGrid({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} aria-hidden className="flex flex-col overflow-hidden rounded-card border border-app bg-surface">
          <div className="aspect-[16/10] animate-pulse bg-white/[0.04] motion-reduce:animate-none" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-3 w-2/3 rounded-full bg-white/[0.06]" />
            <div className="h-2.5 w-1/3 rounded-full bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}
