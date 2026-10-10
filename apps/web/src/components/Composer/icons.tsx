import type { ReactNode, SVGProps } from "react";

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

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 8H3.5M7.5 4 3.5 8l4 4" />
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

export const SparklesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 2.5 7.6 5.4a1.6 1.6 0 0 0 1 1L11.5 7.5l-2.9 1.1a1.6 1.6 0 0 0-1 1L6.5 12.5 5.4 9.6a1.6 1.6 0 0 0-1-1L1.5 7.5l2.9-1.1a1.6 1.6 0 0 0 1-1z" />
    <path d="M12.5 1.5v3M11 3h3M12.5 11v3M11 12.5h3" />
  </Icon>
);

export const ExportIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 10V2.5M5 5.5l3-3 3 3" />
    <path d="M3 9.5v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="2.75" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="1.5" width="7" height="13" rx="1.75" />
    <path d="M7 12.25h2" />
  </Icon>
);

export const TabletIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="1.5" width="11" height="13" rx="1.75" />
    <path d="M7 12.25h2" />
  </Icon>
);

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.5" />
    <path d="M6 14h4M8 11v3" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 3v10M3 8h10" />
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

export const SlidersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="6" cy="11.5" r="1.5" />
  </Icon>
);

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

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </Icon>
);

export const UnlockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="7" width="10" height="7" rx="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 4.8-1" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 8.5 3 3 6-7" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 9.5a2.5 2.5 0 0 0 3.5 0l2.5-2.5a2.5 2.5 0 0 0-3.5-3.5l-.6.6" />
    <path d="M9.5 6.5a2.5 2.5 0 0 0-3.5 0L3.5 9a2.5 2.5 0 0 0 3.5 3.5l.6-.6" />
  </Icon>
);

export const PaletteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.75a6.25 6.25 0 1 0 0 12.5c.9 0 1.3-.6 1.3-1.2 0-.8-.7-1.1-.7-1.9 0-.7.6-1.2 1.3-1.2h1.4a3.2 3.2 0 0 0 3.2-3.2C14.5 4.2 11.6 1.75 8 1.75Z" />
    <circle cx="5" cy="7" r=".75" fill="currentColor" />
    <circle cx="7.5" cy="4.6" r=".75" fill="currentColor" />
    <circle cx="10.6" cy="5.4" r=".75" fill="currentColor" />
  </Icon>
);

export const LanguagesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 3.5h6M5 2v1.5M3.25 3.5c.4 2.2 1.9 3.9 4 4.75M7 3.5c-.4 2.2-2 3.9-4.5 4.75" />
    <path d="m8.5 14 2.5-6 2.5 6M9.3 12h3.4" />
  </Icon>
);
