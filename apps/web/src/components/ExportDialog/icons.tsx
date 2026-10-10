import type { ReactNode, SVGProps } from "react";

// Generic glyphs only: no brand logos (CLAUDE.md). Destinations are named in text.
type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Icon>
);

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M2 8h12M8 2c1.7 1.8 2.5 3.8 2.5 6S9.7 12.2 8 14C6.3 12.2 5.5 10.2 5.5 8S6.3 3.8 8 2Z" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6" />
    <path d="M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 13.5h10" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
    <path d="M10.5 5.5V4.3c0-1-.8-1.8-1.8-1.8H4.3c-1 0-1.8.8-1.8 1.8v4.4c0 1 .8 1.8 1.8 1.8h1.2" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
    <path d="M5.5 7V5.3a2.5 2.5 0 0 1 5 0V7" />
  </Icon>
);

/** Código: angle brackets. */
export const CodeGlyph = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13" />
  </Icon>
);

/** Figma: variables (stacked swatches). */
export const VariablesGlyph = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="5" height="5" rx="1.2" />
    <rect x="8.5" y="2.5" width="5" height="5" rx="2.5" />
    <rect x="2.5" y="8.5" width="5" height="5" rx="2.5" />
    <path d="M11 8.5 13.5 11 11 13.5 8.5 11Z" />
  </Icon>
);

/** Claude Design: a folder to upload. */
export const FolderUpGlyph = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 5.2c0-.9.7-1.7 1.7-1.7h2.6l1.5 1.6h4.5c.9 0 1.7.7 1.7 1.7v4.9c0 .9-.8 1.7-1.7 1.7H3.7c-1 0-1.7-.8-1.7-1.7Z" />
    <path d="M8 11.2V7.6M6.4 9.2 8 7.6l1.6 1.6" />
  </Icon>
);

/** Framer: a frame with a pointer. */
export const FrameGlyph = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 2v12M11.5 2v4.5M2 4.5h12M2 11.5h4.5" />
    <path d="m9 9 5 1.8-2.2.9-.9 2.2Z" />
  </Icon>
);

/** Your AI: a prompt in a terminal. */
export const PromptGlyph = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="3" width="12" height="10" rx="2" />
    <path d="m5 6.5 2 1.5-2 1.5M8.5 10H11" />
  </Icon>
);

/** Code (TSX): components (three blocks and a plus). */
export const ComponentsGlyph = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" />
    <path d="M11.25 9v4.5M9 11.25h4.5" />
  </Icon>
);

export const ChevronIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />
  </Icon>
);
