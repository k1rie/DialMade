"use client";

import { MotionConfig } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "sonner";
import { TOAST_BOTTOM_VAR } from "@/hooks/useToastClearance";
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

// 24 px from the edges (16 px on phones, sonner's default). The bottom one can be lifted over a bar that floats
// at the bottom of the viewport (`useToastClearance`, e.g. the Layout canvas bar), so toasts never cover it.
const toasterOffset = { top: 24, right: 24, left: 24, bottom: `var(${TOAST_BOTTOM_VAR}, 24px)` };
const toasterMobileOffset = { top: 16, right: 16, left: 16, bottom: `var(${TOAST_BOTTOM_VAR}, 16px)` };

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <MotionConfig reducedMotion="user" transition={smooth}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-center"
          gap={10}
          offset={toasterOffset}
          mobileOffset={toasterMobileOffset}
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
