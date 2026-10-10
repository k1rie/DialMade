"use client";

import { MotionConfig } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n";
import { smooth } from "@/lib/motion";

const toasterStyle = {
  "--normal-bg": "var(--app-bg-elevated)",
  "--normal-border": "var(--app-border-strong)",
  "--normal-text": "var(--app-text)",
  "--border-radius": "14px",
  "--width": "360px",
  fontFamily: "var(--font-sans)",
} as CSSProperties;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <MotionConfig reducedMotion="user" transition={smooth}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          gap={10}
          offset={24}
          style={toasterStyle}
          toastOptions={{
            className: "!shadow-surface !text-small",
            classNames: {
              description: "!text-muted",
              actionButton: "!bg-accent-cta !text-white !rounded-chip",
              cancelButton: "!bg-white/10 !text-fg !rounded-chip",
            },
          }}
        />
      </MotionConfig>
    </I18nProvider>
  );
}
