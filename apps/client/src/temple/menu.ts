import type { AllTranslationKeys } from "@i18n";
import type { ChamberLink } from "@temple/zones";

export type MenuGroup = {
  labelKey: AllTranslationKeys;
  pages: ChamberLink[];
};

/**
 * The menu, by what a visitor wants to do. Every page of the four zones is
 * here; only the grouping differs. The zones still pick each page's skin.
 */
export const menu: MenuGroup[] = [
  {
    labelKey: "nav.groupVisit",
    pages: [
      { href: "/slujbe", labelKey: "zone.slujbe" },
      { href: "/cum-de-ajuns", labelKey: "zone.directions" },
      { href: "/cazare", labelKey: "zone.cazare" },
      { href: "/contact", labelKey: "nav.contact" },
    ],
  },
  {
    labelKey: "nav.groupPrayer",
    pages: [
      { href: "/pomelnic", labelKey: "zone.pomelnic" },
      { href: "/donations", labelKey: "nav.donations" },
      { href: "/macarie", labelKey: "zone.macarie" },
      { href: "/viata-si-activitatea", labelKey: "zone.viataActivitate" },
      { href: "/moastele", labelKey: "zone.moastele" },
      { href: "/acatistul", labelKey: "zone.acatistul" },
      { href: "/slujba", labelKey: "zone.slujba" },
    ],
  },
  {
    labelKey: "nav.groupNews",
    pages: [
      { href: "/posts", labelKey: "zone.cronica" },
      { href: "/galerie", labelKey: "zone.galerie" },
      { href: "/video", labelKey: "zone.video" },
    ],
  },
  {
    labelKey: "nav.groupAbout",
    pages: [
      { href: "/prezentare", labelKey: "zone.prezentare" },
      { href: "/istoria", labelKey: "zone.istoria" },
      { href: "/cronologie", labelKey: "zone.cronologie" },
      { href: "/obstea", labelKey: "zone.obstea" },
      { href: "/mitropolitul", labelKey: "zone.mitropolitul" },
      { href: "/staretul", labelKey: "zone.staretul" },
      { href: "/sfanta-treime", labelKey: "zone.sfantaTreime" },
      { href: "/nasterea-maicii-domnului", labelKey: "zone.nasterea" },
      { href: "/bunavestirea", labelKey: "zone.bunavestirea" },
      { href: "/biblioteca", labelKey: "zone.biblioteca" },
    ],
  },
];
