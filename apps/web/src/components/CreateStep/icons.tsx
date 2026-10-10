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

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M13 8H3M7 4 3 8l4 4" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m3.5 8.25 3 3 6-6.5" />
  </svg>
);

export const SparkleIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 2.25c.35 2.9 1.85 4.4 4.75 4.75C9.85 7.35 8.35 8.85 8 11.75 7.65 8.85 6.15 7.35 3.25 7 6.15 6.65 7.65 5.15 8 2.25Z" />
    <path d="M12.5 11v3M11 12.5h3" />
  </svg>
);

export const DropIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M8 2.5v7M5 6.75 8 9.75l3-3" />
    <path d="M2.75 10.5v1.75c0 .69.56 1.25 1.25 1.25h8c.69 0 1.25-.56 1.25-1.25V10.5" />
  </svg>
);
