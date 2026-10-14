import type { AllTranslationKeys } from "@i18n";

export type ZoneId = "rock" | "green" | "gold" | "river";

export type ChamberLink = {
  /** Canonical (Romanian) path. getLocalizedPath adds the locale prefix. */
  href: string;
  labelKey: AllTranslationKeys;
};

export type Zone = {
  id: ZoneId;
  /** Roman numeral, as the descent counts them. */
  numeral: string;
  nameKey: AllTranslationKeys;
  /** down · down · none · sideways — ARCHITECTURE.md */
  movement: "down" | "none" | "sideways";
  /** Measured off the photographs, not chosen. _palette_measured.json */
  palette: [string, string, string];
  pages: ChamberLink[];
};

/**
 * The four zones. This is the only list — the left rail, the homepage descent
 * and the footer all read it, so a new page is added in exactly one place.
 */
export const zones: Zone[] = [
  {
    id: "rock",
    numeral: "I",
    nameKey: "zone.rock",
    movement: "down",
    palette: ["#767A86", "#8E9193", "#B0B9D1"],
    pages: [
      { href: "/prezentare", labelKey: "zone.prezentare" },
      { href: "/istoria", labelKey: "zone.istoria" },
      { href: "/cronologie", labelKey: "zone.cronologie" },
      { href: "/bunavestirea", labelKey: "zone.bunavestirea" },
      { href: "/pomelnic", labelKey: "zone.pomelnic" },
    ],
  },
  {
    id: "green",
    numeral: "II",
    nameKey: "zone.green",
    movement: "down",
    palette: ["#2E4328", "#4B6136", "#6F8A73"],
    // The hours first: the service schedule is what a pilgrim opens this zone
    // for, and feasts are announced in the chronicle, so it follows. Then the
    // people (brotherhood, metropolitan, abbot), then the churches.
    pages: [
      { href: "/slujbe", labelKey: "zone.slujbe" },
      { href: "/posts", labelKey: "zone.cronica" },
      { href: "/obstea", labelKey: "zone.obstea" },
      { href: "/mitropolitul", labelKey: "zone.mitropolitul" },
      { href: "/staretul", labelKey: "zone.staretul" },
      { href: "/sfanta-treime", labelKey: "zone.sfantaTreime" },
      { href: "/nasterea-maicii-domnului", labelKey: "zone.nasterea" },
      { href: "/galerie", labelKey: "zone.galerie" },
    ],
  },
  {
    id: "gold",
    numeral: "III",
    nameKey: "zone.gold",
    // "You do not pass through. You stop." Zone III has no page of its own —
    // the door is the zone. These are the chambers behind it.
    movement: "none",
    palette: ["#1D1C22", "#C0A974", "#663037"],
    pages: [
      { href: "/macarie", labelKey: "zone.macarie" },
      { href: "/moastele", labelKey: "zone.moastele" },
      { href: "/acatistul", labelKey: "zone.acatistul" },
      { href: "/slujba", labelKey: "zone.slujba" },
      { href: "/biblioteca", labelKey: "zone.biblioteca" },
    ],
  },
  {
    id: "river",
    numeral: "IV",
    nameKey: "zone.river",
    movement: "sideways",
    palette: ["#649FBD", "#61929E", "#BDD5DC"],
    pages: [
      { href: "/cum-de-ajuns", labelKey: "zone.directions" },
      { href: "/cazare", labelKey: "zone.cazare" },
      { href: "/contact", labelKey: "nav.contact" },
      { href: "/donations", labelKey: "nav.donations" },
    ],
  },
];

export const zoneById = Object.fromEntries(zones.map((zone) => [zone.id, zone])) as Record<ZoneId, Zone>;

/** Which zone owns a path — used to light the rail and pick the chamber skin. */
export function zoneOfPath(path: string): ZoneId | null {
  const clean = path.replace(/\/$/, "") || "/";

  for (const zone of zones) {
    // exact chamber, or anything under it (/posts/<slug>, /posts/an/2020)
    if (zone.pages.some((page) => clean.endsWith(page.href) || clean.includes(`${page.href}/`))) {
      return zone.id;
    }
  }

  return null;
}
