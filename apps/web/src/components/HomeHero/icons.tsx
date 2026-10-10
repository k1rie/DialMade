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

export const LinkIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6.75 9.25a2.75 2.75 0 0 0 3.9 0l2-2a2.75 2.75 0 0 0-3.9-3.9l-.6.6" />
    <path d="M9.25 6.75a2.75 2.75 0 0 0-3.9 0l-2 2a2.75 2.75 0 0 0 3.9 3.9l.6-.6" />
  </svg>
);

export const DropletIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 2.25s4.25 4.3 4.25 7.25a4.25 4.25 0 0 1-8.5 0C3.75 6.55 8 2.25 8 2.25Z" />
  </svg>
);

export const CompareIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M6 5 3 8l3 3M10 5l3 3-3 3" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.25 8h9.5M8.75 4l4 4-4 4" />
  </svg>
);
