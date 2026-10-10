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

export const UploadIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 10.5V2.75M4.75 6 8 2.75 11.25 6" />
    <path d="M2.75 10.25v1.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
  </svg>
);

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

export const FileIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M9.25 2.25H5a1.5 1.5 0 0 0-1.5 1.5v8.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V5.5L9.25 2.25Z" />
    <path d="M9.25 2.25V5.5h3.25M6 8.75h4M6 11h2.5" />
  </svg>
);

export const ImageIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.75" />
    <path d="m2.75 11 3.1-3.1a1 1 0 0 1 1.4 0L10.5 11.2M9.25 9.9l1.1-1.1a1 1 0 0 1 1.4 0l1.75 1.75" />
    <circle cx="10.25" cy="5.75" r="1" />
  </svg>
);

export const ClipboardIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.25" y="3" width="9.5" height="10.75" rx="1.5" />
    <path d="M6 3V2.5a.75.75 0 0 1 .75-.75h2.5A.75.75 0 0 1 10 2.5V3M5.75 7.5h4.5M5.75 10h3" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
  </svg>
);

export const AlertIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 5.5v3M8 10.75v.01" />
    <path d="M7.13 2.75a1 1 0 0 1 1.74 0l5.02 8.75a1 1 0 0 1-.87 1.5H2.98a1 1 0 0 1-.87-1.5l5.02-8.75Z" />
  </svg>
);
