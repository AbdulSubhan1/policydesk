// Our own icon set: 24px grid, 1.8 stroke, drawn with currentColor. Add new icons here, never from a package.
const PATHS = {
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  inbox: "M4 13l2.5-8h11L20 13M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  clipboard: "M9 4h6v3H9zM7 5.5H5.5V20h13V5.5H17M8.5 11h7M8.5 15h5",
  badgeCheck:
    "M12 3l2.4 1.7 2.9-.2.9 2.8 2.3 1.8-.9 2.9.9 2.9-2.3 1.8-.9 2.8-2.9-.2L12 21l-2.4-1.7-2.9.2-.9-2.8-2.3-1.8.9-2.9-.9-2.9 2.3-1.8.9-2.8 2.9.2zM8.8 12.2l2.2 2.2 4.2-4.4",
  shield: "M12 3l7.5 3v5.5c0 4.4-3.1 8-7.5 9.5-4.4-1.5-7.5-5.1-7.5-9.5V6zM9 12l2 2 4-4.5",
  package: "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9",
  fileSettings: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h4",
  users:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.3a3.5 3.5 0 010 6.4M18 14.8c2 .6 3.2 2.4 3.5 5.2",
  key: "M14.5 9.5a5 5 0 11-1.4-3.5M14.5 9.5L21 3M18 6l2 2M16 8l2 2",
  scroll: "M7 4h11v13a3 3 0 01-3 3H6a3 3 0 01-3-3v-1h11v1a3 3 0 003 3M7 4a2 2 0 00-2 2v10M10 8h5M10 12h5",
  palette:
    "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.5-1.5-1.8-1.5-3 0-1 .8-1.5 1.8-1.5H16a5 5 0 005-5c0-3.9-4-7-9-7zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01",
  globe:
    "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z",
  book: "M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5zM4 20.5A2.5 2.5 0 016.5 18H20v3H6.5A2.5 2.5 0 014 20.5zM8 7h8M8 11h6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  more: "M6.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM13.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM20.2 12a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  send: "M4 12l16-8-6 16-2-7z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:
    "M3 3l18 18M10.6 5.1A10.5 10.5 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.3 4.2M6.6 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 005.4-1.6M9.9 9.9a3 3 0 004.2 4.2",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01",
  alert: "M12 3l10 18H2zM12 10v4M12 17h.01",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 3v4M17 5h4",
  chevronStart: "M15 5l-7 7 7 7",
  chevronDown: "M6 9l6 6 6-6",
  chevronEnd: "M9 5l7 7-7 7",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
} as const;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      data-ui="Icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
