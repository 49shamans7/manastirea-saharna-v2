// Imports the monastery's own long-form pages out of the WordPress archive.
// These replace the truncated versions taken from design/extracted/_text_ro.json,
// which cut the liturgical texts off partway.
//
//   bun scripts/import-pages.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const OUT = path.join(ROOT, "apps/client/src/content/pages/ro");

const BOILERPLATE = [
  "Partajează asta",
  "Tweet",
  "Partajează prin WhatsApp",
  "Conținutul acestui website",
  "Calendar Creștin Ortodox",
  "Galeria Video",
];

const CEDILLA = { ş: "ș", Ş: "Ș", ţ: "ț", Ţ: "Ț" };

// archive slug → the chamber it becomes. Zone and template per ARCHITECTURE.md.
const PAGES = [
  {
    from: "prezentare",
    slug: "prezentare",
    zone: "rock",
    template: "chamber",
    order: 0,
    title: "Prezentare",
    eyebrow: "Stânca · zona I",
    lead: "Refugiul sau clipa regăsirii cu propriul suflet.",
  },
  {
    from: "istoria-sfintei-manastiri",
    slug: "istoria",
    zone: "rock",
    template: "chamber",
    order: 1,
    title: "Istoria sfintei mănăstiri",
    eyebrow: "Stânca · zona I",
    lead: "Unde începe mănăstirea: în stâncă. Peștera este o lucrare de scădere — piatră luată, nu piatră pusă.",
  },
  {
    from: "viata-cuviosului-macarie",
    slug: "macarie",
    zone: "gold",
    template: "chamber",
    order: 1,
    title: "Cuviosul Macarie",
    eyebrow: "Racla · zona III",
    lead: "Viața Preacuviosului Egumen Macarie Tincu de la Sfânta Mănăstire Saharna.",
  },
  {
    from: "a-c-a-t-i-s-t-u-l-preacuviosului-si-de-dumnezeu-purtatorului-parintelui-nostru-macarie-de-la-saharna",
    slug: "acatistul",
    zone: "gold",
    template: "chamber",
    order: 4,
    title: "Acatistul Cuviosului Macarie",
    eyebrow: "Racla · zona III",
    lead: "Acatistul Preacuviosului și de Dumnezeu purtătorului părintelui nostru Macarie de la Saharna.",
  },
  {
    from: "slujba-cuviosului-macarie",
    slug: "slujba",
    zone: "gold",
    template: "chamber",
    order: 5,
    title: "Slujba Cuviosului Macarie",
    eyebrow: "Racla · zona III",
    lead: "Rânduiala slujbei sfântului, așa cum se cântă la mănăstire.",
  },
  {
    from: "casa-de-oaspeti-sfantul-avraam",
    slug: "cazare",
    zone: "river",
    template: "table",
    order: 2,
    title: "Casa de oaspeți „Sfântul Avraam”",
    eyebrow: "Nistru · zona IV",
    lead: "Reguli de cazare pentru pelerini.",
  },
  {
    from: "biblioteca",
    slug: "biblioteca",
    zone: "gold",
    template: "chamber",
    order: 6,
    title: "Biblioteca",
    eyebrow: "Racla · zona III",
    lead: "Canoanele și textele rânduite, adunate de obște.",
  },
  {
    from: "mitropolitul",
    slug: "mitropolitul",
    zone: "green",
    template: "chamber",
    order: 2,
    title: "Mitropolitul",
    eyebrow: "Mănăstirea vie · zona II",
    lead: "Întâistătătorul Bisericii Ortodoxe din Moldova.",
  },
];

function normalize(text) {
  return text.replace(/[ŞşŢţ]/g, (c) => CEDILLA[c] ?? c);
}

function clean(text) {
  const cuts = BOILERPLATE.map((m) => text.indexOf(m)).filter((i) => i >= 0);
  const body = text.slice(0, cuts.length ? Math.min(...cuts) : text.length);

  return body
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1);
}

/**
 * A short all-caps or title-cased line followed by prose reads as a heading in
 * these texts — the liturgical pages are structured that way (Condacul 1,
 * Icosul 1, …). Promoting them keeps the acatist readable in a chamber.
 */
function withHeadings(lines) {
  return lines.map((line) => {
    const isSection = /^(Condacul|Icosul|Cântarea|Slavă|Troparul|Canoanele|Rugăciunea|Sedealna|Stihira)\b/i.test(line);

    return isSection && line.length < 90 ? `## ${line}` : line;
  });
}

function yaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const content = JSON.parse(await readFile(path.join(ARCHIVE, "text/content.json"), "utf8"));
const bySlug = new Map(content.map((entry) => [entry.slug, entry]));

await mkdir(OUT, { recursive: true });

for (const page of PAGES) {
  const source = bySlug.get(page.from);

  if (!source) {
    console.warn(`missing in archive: ${page.from}`);
    continue;
  }

  const body = withHeadings(clean(normalize(source.text ?? "")));

  const front = [
    "---",
    `title: ${yaml(page.title)}`,
    `eyebrow: ${yaml(page.eyebrow)}`,
    `lead: ${yaml(page.lead)}`,
    `zone: ${page.zone}`,
    `template: ${page.template}`,
    `order: ${page.order}`,
    `sourceUrl: ${yaml(source.url)}`,
    "---",
    "",
    body.join("\n\n"),
    "",
  ].join("\n");

  await writeFile(path.join(OUT, `${page.slug}.md`), front);
  console.log(`${page.slug.padEnd(14)} ${String(source.words).padStart(5)} words  ← ${page.from.slice(0, 44)}`);
}
