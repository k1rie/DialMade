import type { LibraryBlockType } from "@dialmade/layout";
import type { ReactNode, SVGProps } from "react";

/*
 * Icons of the Layout Mode: one line glyph per library block type (`BlockIcon`) plus the UI icons of the
 * canvas, panels and bars. 16×16 grid, 1.5 stroke, `currentColor`, decorative (`aria-hidden`): the
 * accessible name always comes from the control. Original drawings, no brand logos.
 */

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

export function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
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

/** Small solid dot (round caps on a zero-length line), for bullets and calendar days. */
const dot = (x: number, y: number) => `M${x} ${y}h.01`;

/* ------------------------------------------------------------------------------------------------ */
/* Block glyphs                                                                                     */
/* ------------------------------------------------------------------------------------------------ */

/** Glyph of every block type. Typed as a full record: adding a type to the package fails here until it has one. */
const BLOCK_GLYPHS: Record<LibraryBlockType, ReactNode> = {
  // Navigation
  navbar: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 6h13M3.75 4.25h2.5M10.5 4.25h1.75" />
    </>
  ),
  sidebar: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6 2.5v11M3.25 5.25h1M3.25 7.5h1M3.25 9.75h1" />
    </>
  ),
  footer: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 10h13M3.75 11.75h2.5M9.75 11.75h2.5" />
    </>
  ),
  tabs: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6 2.5V6h8.5M10.25 2.5V6" />
    </>
  ),
  stepper: (
    <>
      <circle cx="3" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="13" cy="8" r="1.5" />
      <path d="M4.5 8h2M9.5 8h2" />
    </>
  ),
  pagination: <path d={`M4 5.5 1.75 8 4 10.5M12 5.5 14.25 8 12 10.5${dot(6, 8)}${dot(8, 8)}${dot(10, 8)}`} />,

  // Content
  hero: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4.5 6h7M5.75 8.25h4.5M6.75 10.75h2.5" />
    </>
  ),
  features: (
    <>
      <circle cx="3" cy="5" r="1.5" />
      <circle cx="8" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <path d="M1.5 9.5h3M6.5 9.5h3M11.5 9.5h3M2 12h2M7 12h2M12 12h2" />
    </>
  ),
  logos: (
    <>
      <circle cx="3.5" cy="8" r="2" />
      <path d="M8 6l2.1 3.75H5.9z" />
      <rect x="11" y="6" width="3.75" height="3.75" rx=".75" />
    </>
  ),
  testimonials: (
    <>
      <path d="M2.5 2.5h11a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H7.25L4 13.5V11H2.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M5.5 5.5v1.75M8 5.5v1.75" />
    </>
  ),
  pricing: (
    <>
      <path d="M8.75 1.5h4.75a1 1 0 0 1 1 1v4.75L8 13.75a1 1 0 0 1-1.4 0L2.25 9.4a1 1 0 0 1 0-1.4z" />
      <circle cx="11.25" cy="4.75" r="1" />
    </>
  ),
  cta: (
    <>
      <rect x="1.5" y="3" width="11" height="5.5" rx="2.75" />
      <path d="M9.5 8.5 14 10.25l-1.9.7-.75 1.9z" />
    </>
  ),
  text: <path d="M3.5 3.5h9M8 3.5v9.5M6.25 13h3.5" />,
  media: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 11.25 5.25 7.5l3.5 3.5 2-2 3.75 3.75" />
      <circle cx="10.75" cy="5.75" r="1.25" />
    </>
  ),
  faq: (
    <>
      <circle cx="8" cy="8" r="6.5" />
      <path d={`M6.25 6.25a1.75 1.75 0 1 1 2.6 1.55c-.55.3-.85.7-.85 1.2v.4${dot(8, 11.5)}`} />
    </>
  ),
  banner: (
    <>
      <path d="M2.5 6.25v3.5h2l5 3V3.25l-5 3z" />
      <path d="M11.75 5.75a2.75 2.75 0 0 1 0 4.5" />
    </>
  ),
  timeline: (
    <>
      <path d="M4 2v12M7 4.5h6.5M7 8h5M7 11.5h6" />
      <circle cx="4" cy="4.5" r="1.25" fill="currentColor" />
      <circle cx="4" cy="8" r="1.25" fill="currentColor" />
      <circle cx="4" cy="11.5" r="1.25" fill="currentColor" />
    </>
  ),

  // Data
  kpis: (
    <>
      <path d="M2 11.5a6 6 0 0 1 12 0" />
      <path d="M8 11.5 10.75 7.5M4.25 11.5h.01M11.75 11.5h.01" />
    </>
  ),
  chart: <path d="M2 2.5v11h12M5 10.5V8M8 10.5V5M11 10.5V6.5" />,
  table: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M1.5 6h13M1.5 9.75h13M6 6v7.5" />
    </>
  ),
  activity: <path d="M1.5 8h3l1.75-4.5 3.5 9L11.5 8h3" />,
  cards: (
    <>
      <rect x="1.5" y="3" width="5.5" height="10" rx="1" />
      <rect x="9" y="3" width="5.5" height="10" rx="1" />
      <path d="M1.5 7h5.5M9 7h5.5M3 9.5h2.5M10.5 9.5h2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" />
      <path d={`M1.5 6.5h13M5 1.5v3M11 1.5v3${dot(5, 9.25)}${dot(8, 9.25)}${dot(11, 9.25)}${dot(5, 11.75)}${dot(8, 11.75)}`} />
    </>
  ),
  list: <path d={`M6 4h8M6 8h8M6 12h8${dot(2.75, 4)}${dot(2.75, 8)}${dot(2.75, 12)}`} />,
  kanban: (
    <>
      <rect x="1.5" y="2" width="3.5" height="9" rx="1" />
      <rect x="6.25" y="2" width="3.5" height="12" rx="1" />
      <rect x="11" y="2" width="3.5" height="6" rx="1" />
    </>
  ),
  search: (
    <>
      <rect x="1.5" y="4.5" width="13" height="7" rx="3.5" />
      <circle cx="5.5" cy="7.75" r="1.5" />
      <path d="M6.6 8.85 7.5 9.75M9.5 8h2.5" />
    </>
  ),

  // Forms
  settings: (
    <>
      <path d="M6.8 3.25 7.1 1.55h1.8l.3 1.7 1.3.55 1.4-1 1.3 1.3-1 1.4.55 1.3 1.7.3v1.8l-1.7.3-.55 1.3 1 1.4-1.3 1.3-1.4-1-1.3.55-.3 1.7H7.1l-.3-1.7-1.3-.55-1.4 1-1.3-1.3 1-1.4-.55-1.3-1.7-.3V7.1l1.7-.3.55-1.3-1-1.4 1.3-1.3 1.4 1z" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  form: (
    <>
      <rect x="1.5" y="1.75" width="13" height="3" rx="1" />
      <rect x="1.5" y="6.5" width="13" height="3" rx="1" />
      <rect x="1.5" y="11.25" width="6" height="3" rx="1.5" />
    </>
  ),
  upload: <path d="M8 10V2.5M5 5.5l3-3 3 3M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" />,

  // States and overlays
  modal: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" strokeOpacity={0.45} />
      <rect x="4" y="5" width="8" height="6" rx="1" />
      <path d="M5.75 7.25h3" />
    </>
  ),
  empty: (
    <>
      <path d="M1.5 9 3.5 3.5h9l2 5.5v3.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
      <path d="M1.5 9h3.75l1 1.5h3.5l1-1.5h3.75" />
    </>
  ),
  notifications: <path d="M4 11V7a4 4 0 0 1 8 0v4l1.25 1.5H2.75zM6.5 14.25h3" />,

  // Media, social and commerce
  gallery: (
    <>
      <path d="M4.5 3.5v-1a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-1" />
      <rect x="1.5" y="4.5" width="10" height="10" rx="1" />
      <path d="M1.5 12.25 4.5 9.25l2.5 2.5 1.5-1.5 3 3" />
    </>
  ),
  chat: (
    <>
      <path d="M2 3.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1V7a1 1 0 0 1-1 1H5.25L3 9.75V8a1 1 0 0 1-1-1z" />
      <path d="M12.5 6h.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1v1.75l-2.25-1.75H7.5a1 1 0 0 1-1-1v-.75" />
    </>
  ),
  profile: (
    <>
      <circle cx="8" cy="5.25" r="2.75" />
      <path d="M2.75 14a5.25 5.25 0 0 1 10.5 0" />
    </>
  ),
  map: <path d="M1.5 4 5.5 2.5l5 1.5 4-1.5V12l-4 1.5-5-1.5-4 1.5zM5.5 2.5V12M10.5 4v9.5" />,
  cart: (
    <>
      <path d="M1.5 2.5h1.75l1.6 7.5h7.4l1.5-5.25H4.1" />
      <circle cx="6" cy="13" r="1" />
      <circle cx="11.75" cy="13" r="1" />
    </>
  ),
  checkout: (
    <>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13M4 10h2.5" />
    </>
  ),
  video: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6.5 5.75v4.5L10.25 8z" />
    </>
  ),

  // Basics
  free: <rect x="2" y="2.5" width="12" height="11" rx="1.5" strokeDasharray="2 2" />,
  container: (
    <>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
      <rect x="4.25" y="4.25" width="7.5" height="3" rx=".75" />
      <rect x="4.25" y="8.75" width="7.5" height="3" rx=".75" />
    </>
  ),
};

export type BlockIconProps = IconProps & { type: LibraryBlockType };

/** Line icon of a library block type (`LibraryBlockDef.icon`). */
export function BlockIcon({ type, ...props }: BlockIconProps) {
  return <Icon {...props}>{BLOCK_GLYPHS[type]}</Icon>;
}

/* ------------------------------------------------------------------------------------------------ */
/* Tools                                                                                            */
/* ------------------------------------------------------------------------------------------------ */

/** Draw tool (R): a box with a plus. */
export const DrawIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6" />
    <path d="M12.5 1v4M10.5 3h4" />
  </Icon>
);

/** Edit tool (V): the pointer. */
export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 2.5 13 6.75l-4.25 1.5-1.5 4.25z" />
    <path d="m8.75 8.25 4 4" />
  </Icon>
);

/** Hand tool (H): pans the canvas. */
export const HandIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 8.5V3.75a1 1 0 0 1 2 0V7.5M7.5 7.25V2.75a1 1 0 0 1 2 0V7.5M9.5 7.5V3.75a1 1 0 0 1 2 0V8" />
    <path d="M11.5 8V5.75a1 1 0 0 1 2 0V10a4.5 4.5 0 0 1-4.5 4.5h-.75a4.5 4.5 0 0 1-3.6-1.8L2.4 9.85a1 1 0 0 1 1.5-1.3l1.6 1.45" />
  </Icon>
);

/* ------------------------------------------------------------------------------------------------ */
/* Actions                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v10M3 8h10" />
  </Icon>
);

/** For the −/+ count stepper. */
export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8h10" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3.5 3.5" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </Icon>
);

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.3 3.7A6.4 6.4 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.7 2.2M10 11.9a5.6 5.6 0 0 1-2 .6C4 12.5 1.5 8 1.5 8a11 11 0 0 1 2.6-3" />
    <path d="M6.6 6.6a2 2 0 0 0 2.8 2.8M2 2l12 12" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
    <path d="m4 4.5.6 8.6a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.6M6.75 7.25v4M9.25 7.25v4" />
  </Icon>
);

/** Duplicate a block or a screen: two squares. */
export const DuplicateIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" />
    <path d="M10.5 3.25V2.5a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.75" />
  </Icon>
);

/** Copy to the clipboard (reports, CSS, JSON): a clipboard. */
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.25 2.75h-.75a1 1 0 0 0-1 1v9.75a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V3.75a1 1 0 0 0-1-1h-.75" />
    <rect x="5.25" y="1.5" width="5.5" height="2.5" rx=".75" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 3.5 2.5 6.5l3 3" />
    <path d="M2.5 6.5h7a4 4 0 0 1 0 8H7" />
  </Icon>
);

export const RedoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m10.5 3.5 3 3-3 3" />
    <path d="M13.5 6.5h-7a4 4 0 0 0 0 8H9" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d={`${dot(3.5, 8)}${dot(8, 8)}${dot(12.5, 8)}`} strokeWidth={2.25} />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-.6.6" />
    <path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.6-.6" />
  </Icon>
);

/** Opens in a new tab («Votar en GitHub»). */
export const ExternalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5" />
    <path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
  </Icon>
);

/** «Generar»: sparkles. */
export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 2.5 7.6 5.4a1.6 1.6 0 0 0 1 1L11.5 7.5l-2.9 1.1a1.6 1.6 0 0 0-1 1L6.5 12.5 5.4 9.6a1.6 1.6 0 0 0-1-1L1.5 7.5l2.9-1.1a1.6 1.6 0 0 0 1-1z" />
    <path d="M12.5 1.5v3M11 3h3M12.5 11v3M11 12.5h3" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Icon>
);

export const WarningIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.5 9.75a1 1 0 0 1-.87 1.5H2.5a1 1 0 0 1-.87-1.5z" />
    <path d={`M8 6.25v3${dot(8, 11.5)}`} />
  </Icon>
);

/** Drag handle (screens list, layers). */
export const GripIcon = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none">
    <circle cx="6" cy="4" r="1.1" />
    <circle cx="10" cy="4" r="1.1" />
    <circle cx="6" cy="8" r="1.1" />
    <circle cx="10" cy="8" r="1.1" />
    <circle cx="6" cy="12" r="1.1" />
    <circle cx="10" cy="12" r="1.1" />
  </Icon>
);

/** Fine adjust: move mode. */
export const MoveIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.75v12.5M1.75 8h12.5M6 3.75l2-2 2 2M6 12.25l2 2 2-2M3.75 6l-2 2 2 2M12.25 6l2 2-2 2" />
  </Icon>
);

/** Fine adjust: size mode. */
export const ResizeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5l-11 11" />
  </Icon>
);

/** «Anidar» / «Meter dentro»: an arrow into a box. */
export const NestIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6.5" y="6.5" width="8" height="8" rx="1.5" />
    <path d="M1.5 1.5v4a2 2 0 0 0 2 2H10M8 5l2.5 2.5L8 10" />
  </Icon>
);

/** «Ver estructura»: a tree of regions. */
export const StructureIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="1.5" width="5" height="3.5" rx=".75" />
    <rect x="1.5" y="11" width="5" height="3.5" rx=".75" />
    <rect x="9.5" y="11" width="5" height="3.5" rx=".75" />
    <path d="M8 5v3M4 11V9.25a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1V11" />
  </Icon>
);

export const KeyboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
    <path d={`${dot(4.25, 6.25)}${dot(6.75, 6.25)}${dot(9.25, 6.25)}${dot(11.75, 6.25)}M5 9.75h6`} />
  </Icon>
);

/* ------------------------------------------------------------------------------------------------ */
/* Direction                                                                                        */
/* ------------------------------------------------------------------------------------------------ */

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 6 8 10.5 12.5 6" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 10 8 5.5l4.5 4.5" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 3.5 5.5 8l4.5 4.5" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 3.5 4.5 4.5L6 12.5" />
  </Icon>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 13V3.5M4 7.5l4-4 4 4" />
  </Icon>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v9.5M4 8.5l4 4 4-4" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 8H3.5M7.5 4 3.5 8l4 4" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8h9.5M8.5 4l4 4-4 4" />
  </Icon>
);

/* ------------------------------------------------------------------------------------------------ */
/* Devices and panels                                                                               */
/* ------------------------------------------------------------------------------------------------ */

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" />
    <path d="M6 14h4M8 11v3" />
  </Icon>
);

export const TabletIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="1.5" width="11" height="13" rx="1.75" />
    <path d="M7 12.25h2" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="1.5" width="7" height="13" rx="1.75" />
    <path d="M7 12.25h2" />
  </Icon>
);

/** «Capas» tab. */
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.75 14.5 5 8 8.25 1.5 5z" />
    <path d="M1.5 8 8 11.25 14.5 8M1.5 11 8 14.25 14.5 11" />
  </Icon>
);

/** «Bloques» tab: three tiles and a plus. */
export const BlocksIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.5" y="1.5" width="5.25" height="5.25" rx="1" />
    <rect x="9.25" y="1.5" width="5.25" height="5.25" rx="1" />
    <rect x="1.5" y="9.25" width="5.25" height="5.25" rx="1" />
    <path d="M11.875 9.25v5.25M9.25 11.875h5.25" />
  </Icon>
);

/** «Pantallas» panel: two windows. */
export const ScreensIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 4.5v-2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2" />
    <rect x="1.5" y="4.5" width="10" height="10" rx="1" />
    <path d="M1.5 7.25h10" />
  </Icon>
);
