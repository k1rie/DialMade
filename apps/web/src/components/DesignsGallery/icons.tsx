// Icons of «Mis diseños» and its cards (decorative: aria-hidden).
const base = { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" } as const;

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="7" cy="7" r="4" />
    <path d="m10 10 3 3" />
  </svg>
);

export const GridIcon = () => (
  <svg {...base}>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
    <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
    <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
  </svg>
);

export const ListIcon = () => (
  <svg {...base}>
    <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
  </svg>
);

export const MoreIcon = () => (
  <svg {...base}>
    <path d="M4 8h.01M8 8h.01M12 8h.01" strokeWidth={2.25} />
  </svg>
);

export const FolderIcon = () => (
  <svg {...base}>
    <path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
  </svg>
);
