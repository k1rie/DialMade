import type { ReactNode } from "react";

/** Simple geometric marks (24×24, currentColor). Fictional by construction: never a real brand. */
export const LOGO_MARKS: readonly ReactNode[] = [
  <circle key="m" cx="12" cy="12" r="9" />,
  <g key="m">
    <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
    <circle cx="12" cy="12" r="3" />
  </g>,
  <path key="m" d="M12 2 22 12 12 22 2 12Z" />,
  <g key="m">
    <rect x="3" y="5" width="18" height="5" rx="2.5" />
    <rect x="3" y="14" width="11" height="5" rx="2.5" />
  </g>,
  <path key="m" d="M12 3 22 20H2Z" />,
  <g key="m">
    <path d="M3 13a9 9 0 0 1 18 0Z" />
    <rect x="3" y="15.5" width="18" height="3.5" rx="1.75" />
  </g>,
  <g key="m">
    <circle cx="7" cy="7" r="4" />
    <circle cx="17" cy="7" r="4" />
    <circle cx="7" cy="17" r="4" />
    <circle cx="17" cy="17" r="4" opacity="0.45" />
  </g>,
  <path key="m" d="M12 2 21 7v10l-9 5-9-5V7Z" />,
];

export const WORDMARK_STYLES = 4;
