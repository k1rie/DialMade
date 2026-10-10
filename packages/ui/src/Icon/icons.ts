const circle = (cx: number, cy: number, r: number) =>
  `M${cx + r} ${cy}a${r} ${r} 0 1 1-${2 * r} 0 ${r} ${r} 0 0 1 ${2 * r} 0Z`;

/** Iconos propios: trazos de 24×24, `stroke="currentColor"`, sin relleno. */
export const ICONS = {
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  minus: ["M6 12h12"],
  plus: ["M12 5v14", "M5 12h14"],
  x: ["M6.5 6.5l11 11", "M17.5 6.5l-11 11"],
  "chevron-down": ["M6.5 9.5 12 15l5.5-5.5"],
  "chevron-up": ["M6.5 14.5 12 9l5.5 5.5"],
  "chevron-left": ["M14.5 6.5 9 12l5.5 5.5"],
  "chevron-right": ["M9.5 6.5 15 12l-5.5 5.5"],
  "chevrons-up-down": ["M8 9.5l4-4 4 4", "M8 14.5l4 4 4-4"],
  "arrow-right": ["M5 12h14", "M13 6l6 6-6 6"],
  "arrow-up-right": ["M7 17 17 7", "M8.5 7H17v8.5"],
  "arrow-down-right": ["M7 7l10 10", "M17 8.5V17H8.5"],
  search: [circle(11, 11, 6.5), "M20 20l-4.3-4.3"],
  info: [circle(12, 12, 9), "M12 11v5", "M12 7.9v.1"],
  "alert-circle": [circle(12, 12, 9), "M12 7.5v5", "M12 16v.1"],
  "check-circle": [circle(12, 12, 9), "M8.5 12.3l2.4 2.4 4.6-4.9"],
  "alert-triangle": [
    "M10.3 4.3 2.9 17.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z",
    "M12 9.5v4",
    "M12 16.9v.1",
  ],
  loader: ["M21 12a9 9 0 1 1-6.3-8.6"],
  more: [circle(6, 12, 1), circle(12, 12, 1), circle(18, 12, 1)],
  home: ["M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"],
  "bar-chart": ["M5 20v-8", "M12 20V5", "M19 20v-5"],
  users: [
    circle(9, 8, 3.5),
    "M2.5 20c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6",
    "M16 4.7a3.5 3.5 0 0 1 0 6.6",
    "M18.2 14.8c1.9.8 3.3 2.5 3.3 5.2",
  ],
  user: [circle(12, 8, 4), "M4.5 20.5c0-3.7 3.4-6.2 7.5-6.2s7.5 2.5 7.5 6.2"],
  sliders: ["M4 7h9", "M17 7h3", circle(15, 7, 2), "M4 17h3", "M11 17h9", circle(9, 17, 2)],
  bell: ["M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15Z", "M10 20.5a2 2 0 0 0 4 0"],
  file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z", "M14 3v5h5"],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"],
  inbox: ["M3 13h5l1.5 3h5l1.5-3h5", "M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"],
  mail: [
    "M4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-11A1.5 1.5 0 0 1 4.5 5Z",
    "M3.5 6.5 12 13l8.5-6.5",
  ],
  calendar: ["M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z", "M4 10h16", "M8 3v4", "M16 3v4"],
  trash: ["M4 7h16", "M9.5 7V4.5h5V7", "M6.5 7l1 12.5h9l1-12.5"],
  copy: ["M10 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z", "M5 15V5a1 1 0 0 1 1-1h10"],
  "log-out": ["M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3", "M15 8l4 4-4 4", "M19 12H9"],
  download: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  filter: ["M4 5h16l-6 7.5V19l-4 1.5v-8Z"],
  sparkle: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z", "M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"],
  "external-link": ["M14 4h6v6", "M20 4l-9 9", "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"],
  edit: ["M15.5 4.5l4 4L9 19H5v-4Z", "M13.5 6.5l4 4"],
  link: ["M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1", "M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
