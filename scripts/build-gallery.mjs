// Derives the site gallery from the extracted archive.
// Source  design/extracted/images/<category>/   (701 photographs, read-only)
// Output  apps/client/public/gallery/<category>/<name>.webp  + -thumb.webp
//         apps/client/src/data/gallery.json    (the manifest the page reads)
//
// Every derivative is restored through scripts/lib/restore.mjs (house grade)
// and written as .webp:
//   <name>.webp           ≤1400w, the lightbox frame (native aspect)
//   <name>-thumb.webp     480w  (native aspect — the chamber pages use it too)
//   <name>-thumb-sm.webp  360w  (native aspect)
//   <name>-sq.webp        480×480 tile, the square placed by focusSquare()
//   <name>-sq-sm.webp     360×360 tile
// The three categories build-gallery-curated.mjs upgrades from the archive
// (macarie, relics, brotherhood) are left alone here: their entries in
// gallery.json and their folders are that script's, and are carried over.
//
// The archive itself is never modified. Re-run after adding to it:
//   bun scripts/build-gallery.mjs
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { derive } from "./lib/gallery.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "design/extracted/images");
const OUT = path.join(ROOT, "apps/client/public/gallery");
const MANIFEST = path.join(ROOT, "apps/client/src/data/gallery.json");

// The folders are real categories — they are the page each photograph was
// found on. misc/ is the chronicle feed and is deliberately excluded: it is
// unsorted, and the gallery is a sorted thing.
const CATEGORIES = [
  { dir: "complex-overview", key: "complex" },
  { dir: "church-sfanta-treime", key: "sfantaTreime" },
  { dir: "cave-chapel-bunavestirea", key: "cave" },
  { dir: "church-nasterea-maicii", key: "nasterea" },
  { dir: "st-macarie", key: "macarie", curated: true },
  { dir: "relics-macarie", key: "relics", curated: true },
  { dir: "brotherhood", key: "brotherhood", curated: true },
];

// Not photographs: marks and logos that sat in a category folder because
// they were on that page. The gallery shows the place, not its emblems.
const EXCLUDE = new Set(["cropped-chrizma"]); // the Chi-Rho logo

const previous = JSON.parse(await readFile(MANIFEST, "utf8").catch(() => "[]"));
const manifest = [];

for (const category of CATEGORIES) {
  if (category.curated) {
    const kept = previous.find((entry) => entry.key === category.key);
    if (kept) manifest.push(kept);
    console.log(`${category.dir.padEnd(28)} ${kept ? kept.items.length : 0} (curated, carried over)`);
    continue;
  }
  const srcDir = path.join(SRC, category.dir);
  const outDir = path.join(OUT, category.dir);
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(srcDir)).filter((name) => /\.(jpe?g|png)$/i.test(name)).sort();
  const items = [];

  for (const file of files) {
    // URL-safe, stable, and short enough to read in a directory listing.
    const slug = path
      .basename(file, path.extname(file))
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60);

    if (EXCLUDE.has(slug)) continue;

    const meta = await derive(path.join(srcDir, file), path.join(outDir, slug), slug);

    if (meta) {
      items.push({
        src: `/gallery/${category.dir}/${slug}.webp`,
        thumb: `/gallery/${category.dir}/${slug}-thumb.webp`,
        tile: `/gallery/${category.dir}/${slug}-sq.webp`,
        width: meta.width,
        height: meta.height,
      });
    }
  }

  manifest.push({ key: category.key, dir: category.dir, items });
  console.log(`${category.dir.padEnd(28)} ${items.length}`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${manifest.reduce((n, c) => n + c.items.length, 0)} photographs → ${MANIFEST}`);
