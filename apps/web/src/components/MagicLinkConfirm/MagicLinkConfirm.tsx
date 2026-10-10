"use client";

// The step between the email and the sign-in: says which account the link opens and waits for a click.
import { motion } from "motion/react";
import Link from "next/link";
import { useId } from "react";
import { DialMark } from "@/components/DialMark";
import { buttonBase, buttonSizes, buttonVariants } from "@/components/ui/Button";
import { useDictionary } from "@/i18n";
import { authText } from "@/i18n/auth";
import { cn } from "@/lib/cn";
import { stageVariants } from "@/lib/motion";

export type MagicLinkConfirmProps = {
  /** Same-origin URL that uses the link; `null` when the link is not valid. */
  href: string | null;
  /** Shown only when the server verified it. */
  email: string | null;
};

export function MagicLinkConfirm({ href, email }: MagicLinkConfirmProps) {
  const t = useDictionary(authText).confirm;
  const titleId = useId();
  return (
    <motion.section aria-labelledby={titleId} variants={stageVariants} initial="initial" animate="animate" className="flex w-full max-w-[22.5rem] flex-col items-center gap-5 text-center">
      <DialMark className="size-11" />
      <h1 id={titleId} className="m-0 text-h2">
        {t.title}
      </h1>
      {href ? (
        <>
          <p className="m-0 text-body text-muted">{email ? t.as(email) : t.generic}</p>
          {/* A plain same-origin navigation: the server only accepts the link from here. */}
          <a href={href} className={cn(buttonBase, buttonSizes.lg, buttonVariants.primary, "w-full")}>
            <span className="relative">{t.button}</span>
          </a>
          <p className="m-0 text-caption text-subtle">{t.warning}</p>
        </>
      ) : (
        <>
          <p className="m-0 text-body text-muted" role="alert">
            {t.invalid}
          </p>
          <Link href="/login" className={cn(buttonBase, buttonSizes.md, buttonVariants.secondary)}>
            <span className="relative">{t.back}</span>
          </Link>
        </>
      )}
    </motion.section>
  );
}
