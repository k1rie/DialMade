import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden focusable="false" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
  </Icon>
);

export const SwapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
  </Icon>
);

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 3.5v9M3.5 8h9" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.75" />
    <path d="M10.5 3.5A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 3.5 10.5" />
  </Icon>
);

export const DownloadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M3 13h10" />
  </Icon>
);

export const UploadIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 10.5V3M4.75 6 8 2.75 11.25 6M3 13h10" />
  </Icon>
);

export const CropIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 1.5v9a1 1 0 0 0 1 1h9M1.5 4.5h9a1 1 0 0 1 1 1v9" />
  </Icon>
);

export const SunIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </Icon>
);

export const MoonIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85Z" />
  </Icon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m4.5 6.25 3.5 3.5 3.5-3.5" />
  </Icon>
);

export const EyedropperIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9.25 4.25 2.5 2.5M10.6 2.4a1.77 1.77 0 0 1 2.5 2.5l-1.35 1.35-2.5-2.5Z" />
    <path d="M8.9 5.6 3.4 11.1a1.5 1.5 0 0 0-.4.75l-.35 1.5 1.5-.35a1.5 1.5 0 0 0 .75-.4l5.5-5.5" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3.5 8.25 3 3 6-6.5" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 5.75v3M8 11.1v.01" />
    <path d="M7.13 2.5a1 1 0 0 1 1.74 0l5.36 9.5a1 1 0 0 1-.87 1.5H2.64a1 1 0 0 1-.87-1.5Z" />
  </Icon>
);

export const DragIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth="0" fill="currentColor">
    <circle cx="6" cy="4" r="1" />
    <circle cx="10" cy="4" r="1" />
    <circle cx="6" cy="8" r="1" />
    <circle cx="10" cy="8" r="1" />
    <circle cx="6" cy="12" r="1" />
    <circle cx="10" cy="12" r="1" />
  </Icon>
);
