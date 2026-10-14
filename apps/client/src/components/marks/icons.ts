// Path data for the icon set (src/components/marks/Icon.astro) — one 24-unit grid.
// scripts/build-icon-css.mjs reads this file to emit src/assets/marks/icons.css.
export const iconNames = [
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevron-down",
  "close",
  "external",
  "play",
  "menu",
  "phone",
  "mail",
  "map-pin",
  "copy",
  "check",
  "calendar",
  "youtube",
  "tiktok",
  "search",
] as const;
export type IconName = (typeof iconNames)[number];

// stroked line work
export const lines: Partial<Record<IconName, string>> = {
  "arrow-left": "M21 12H5M11 6l-6 6 6 6",
  // a square lens, not a round one: the solid system draws no curves it can avoid
  search: "M4 4h12v12H4zM16 16l5 5",
  "arrow-right": "M3 12h16M13 6l6 6-6 6",
  "arrow-up": "M12 21V5M6 11l6-6 6 6",
  "arrow-down": "M12 3v16M6 13l6 6 6-6",
  "chevron-left": "M15 5l-7 7 7 7",
  "chevron-right": "M9 5l7 7-7 7",
  "chevron-up": "M5 15l7-7 7 7",
  "chevron-down": "M5 9l7 7 7-7",
  close: "M6 6l12 12M18 6L6 18",
  external: "M10 5H4v15h15v-6M14 4h6v6M20 4l-9 9",
  phone: "M4 3h5l1.5 5L8 9.5c1.2 2.8 3.7 5.3 6.5 6.5L16 13.5l5 1.5v5C11.6 20 4 12.4 4 3z",
  mail: "M3 5h18v14H3zM3 5l9 8 9-8",
  "map-pin": "M12 22s7-6.6 7-12.5a7 7 0 0 0-14 0C5 15.4 12 22 12 22zM12 6v6M9.5 8.5h5",
  copy: "M9 9h11v11H9zM15 9V4H4v11h5",
  check: "M4 12.5l5 5L20 6.5",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
};

// filled shapes
export const fills: Partial<Record<IconName, string>> = {
  play: "M7 4v16l13-8z",
  // brand marks, as the platforms draw them (moved from SiteFooter)
  youtube:
    "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z",
  tiktok:
    "M16.6 2c.3 2.6 1.8 4.2 4.3 4.4v3.1a7.6 7.6 0 0 1-4.3-1.3v7.6c0 3.9-2.6 6.2-6.1 6.2-3.6 0-6.4-2.7-6.4-6.1 0-3.7 3.1-6.5 7-6.1v3.2c-2-.3-3.7.9-3.7 2.8 0 1.7 1.4 3 3.1 3 1.8 0 2.8-1.1 2.8-3.3V2h3.3Z",
};

// the four strata — exactly the Navbar opener: 20 wide, 2 high, 3 apart
// one ink, the seal's gold, for all four bars (2026-10-10)
export const strata = ["var(--seal-gold)", "var(--seal-gold)", "var(--seal-gold)", "var(--seal-gold)"];
