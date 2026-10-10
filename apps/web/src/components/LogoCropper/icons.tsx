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

export const CropIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M4.25 1.75v8.5a1.5 1.5 0 0 0 1.5 1.5h8.5" />
    <path d="M1.75 4.25h8.5a1.5 1.5 0 0 1 1.5 1.5v8.5" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
);

export const MinusIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3.5 8h9" />
  </svg>
);

export const FitIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M2.25 5.25v-1.5a1.5 1.5 0 0 1 1.5-1.5h1.5M10.75 2.25h1.5a1.5 1.5 0 0 1 1.5 1.5v1.5M13.75 10.75v1.5a1.5 1.5 0 0 1-1.5 1.5h-1.5M5.25 13.75h-1.5a1.5 1.5 0 0 1-1.5-1.5v-1.5" />
    <rect x="5.5" y="5.5" width="5" height="5" rx="1" />
  </svg>
);

export const SquareIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.25" y="3.25" width="9.5" height="9.5" rx="1.5" />
  </svg>
);

export const FreeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2.25" y="4.25" width="11.5" height="7.5" rx="1.5" strokeDasharray="2 2" />
  </svg>
);
