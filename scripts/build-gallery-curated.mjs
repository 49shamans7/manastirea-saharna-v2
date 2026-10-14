// Upgrades the gallery categories where the archive actually holds better
// pictures, and leaves the rest alone.
//
// The archive session's finding, verified: every dedicated album page on the
// old site tops out at 800×600 — imagini-de-ansamblu, biserica-sfanta-treime,
// manastirea-rupestra. The 4000px material is event photography from posts.
// So `complex`, `sfantaTreime`, `cave` and `nasterea` gain nothing and keep
// the derivatives we already built; `macarie`, `relics` and `brotherhood`
// are genuinely upgraded here.
//
//   bun scripts/build-gallery-curated.mjs
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { derive } from "./lib/gallery.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const OUT = path.join(ROOT, "apps/client/public/gallery");
const MANIFEST = path.join(ROOT, "apps/client/src/data/gallery.json");

// key → the folder it is published under. Only these are rebuilt.
const UPGRADE = {
  macarie: "st-macarie",
  relics: "relics-macarie",
  brotherhood: "brotherhood",
};

const curated = JSON.parse(await readFile(path.join(ARCHIVE, "curated.json"), "utf8"));
const excluded = new Set(curated.excluded_non_photographic ?? []);
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));

function nameOf(file) {
  return path
    .basename(file, path.extname(file))
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

for (const [key, dir] of Object.entries(UPGRADE)) {
  const picks = (curated.gallery?.[key] ?? []).filter((p) => !excluded.has(p));

  if (picks.length === 0) {
    console.warn(`no curated picks for ${key}`);
    continue;
  }

  const outDir = path.join(OUT, dir);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const items = [];

  for (const relative of picks) {
    const source = path.join(ARCHIVE, relative);
    const slug = nameOf(relative);

    // restored (lib/restore.mjs), webp, -thumb / -thumb-sm / square
    // -sq tiles; the size is the EXIF-oriented one
    const size = await derive(source, path.join(outDir, slug), slug);
    // a path that does not resolve is simply not in the gallery
    if (!size) continue;

    items.push({
      src: `/gallery/${dir}/${slug}.webp`,
      thumb: `/gallery/${dir}/${slug}-thumb.webp`,
      tile: `/gallery/${dir}/${slug}-sq.webp`,
      width: size.width,
      height: size.height,
    });
  }

  const category = manifest.find((entry) => entry.key === key);

  if (category) {
    category.items = items;
  } else {
    manifest.push({ key, dir, items });
  }

  const widths = items.map((item) => item.width);
  console.log(`${key.padEnd(12)} ${String(items.length).padStart(3)} images  max ${Math.max(...widths)}px`);
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
