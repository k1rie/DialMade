import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12.75 8h-9.5M7.25 4l-4 4 4 4" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.25 8h9.5M8.75 4l4 4-4 4" />
  </svg>
);

export const LockIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.25" y="7" width="9.5" height="6.75" rx="1.5" />
    <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.5 0V7" />
  </svg>
);

export const UnlockIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.25" y="7" width="9.5" height="6.75" rx="1.5" />
    <path d="M5.25 7V5.25a2.75 2.75 0 0 1 5.3-1" />
  </svg>
);

export const PencilIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M10.25 3.25 12.75 5.75 6 12.5l-3 .5.5-3 6.75-6.75Z" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 3.25v9.5M3.25 8h9.5" />
  </svg>
);

export const RestoreIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.25 7.25a4.75 4.75 0 1 1 1.4 3.4" />
    <path d="M3 3.75v3.5h3.5" />
  </svg>
);

export const MoreIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="4" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8" r=".9" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.5 8.25 6.5 11l6-6.5" />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="5.25" y="5.25" width="8" height="8" rx="1.5" />
    <path d="M10.75 5.25V4.25a1.5 1.5 0 0 0-1.5-1.5h-4.5a1.5 1.5 0 0 0-1.5 1.5v4.5a1.5 1.5 0 0 0 1.5 1.5h.5" />
  </svg>
);

export const AlertIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 5.5v3M8 10.75v.01" />
    <path d="M7.13 2.75a1 1 0 0 1 1.74 0l5.02 8.75a1 1 0 0 1-.87 1.5H2.98a1 1 0 0 1-.87-1.5l5.02-8.75Z" />
  </svg>
);

export const SunIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05" />
  </svg>
);

export const MoonIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85Z" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
  </svg>
);

export const GripIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="6" cy="4.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="10" cy="4.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="6" cy="8" r=".8" fill="currentColor" stroke="none" />
    <circle cx="10" cy="8" r=".8" fill="currentColor" stroke="none" />
    <circle cx="6" cy="11.5" r=".8" fill="currentColor" stroke="none" />
    <circle cx="10" cy="11.5" r=".8" fill="currentColor" stroke="none" />
  </svg>
);
