// Derives the photographs the chamber pages carry from the archive originals.
// Same conventions as build-post-media.mjs: sharp, EXIF rotation applied, never
// enlarged, webp, originals never copied into the repo.
//
// Per photograph: <name>.webp (≤1400w, q80) and <name>-thumb.webp (480w, q72),
// each restored through scripts/lib/restore.mjs as webp,
// into apps/client/public/pages/<slug>/. The markdown references them by
// canonical path (/pages/<slug>/<name>.webp); src/data/pages.ts adds the base.
//
// The three church chambers (sfanta-treime, nasterea-maicii-domnului,
// bunavestirea) need nothing here — their photographs are the gallery's own
// categories and the chambers point at /gallery/<category>/ derivatives.
//
//   bun scripts/build-page-media.mjs           (existing derivatives are reused)
//   bun scripts/build-page-media.mjs --force   (rebuild)
import { access, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { restore } from "./lib/restore.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const OUT = path.join(ROOT, "apps/client/public/pages");
const FORCE = process.argv.includes("--force");

const FULL = { width: 1400, quality: 80, suffix: "" };
const THUMB = { width: 480, quality: 72, suffix: "-thumb" };

// slug → photographs, each an upload path under media/images/ and the name it takes.
const PAGES = [
  {
    slug: "staretul",
    // https://manastirea-saharna.md/staretul/ — the page's only photograph,
    // captioned "Arhimandritul Adrian Baciu, starețul Sfintei Mănăstiri Saharna
    // ( din aprilie 1991 până în prezent )". 502×900: WordPress keeps no larger
    // original (the -e1504010221267 suffix is an in-admin crop), so ≤1400w is 502w.
    photos: [{ from: "2014/06/Image00004-e1504010221267.jpg", name: "adrian-baciu" }],
  },
];

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

let total = 0;

for (const page of PAGES) {
  const dir = path.join(OUT, page.slug);
  await mkdir(dir, { recursive: true });

  for (const photo of page.photos) {
    const source = path.join(ARCHIVE, "media/images", photo.from);
    if (!(await exists(source))) {
      console.warn(`missing in archive: ${photo.from}`);
      continue;
    }

    const sizes = [FULL, THUMB];
    await restore(
      source,
      sizes.map((size) => ({
        file: path.join(dir, `${photo.name}${size.suffix}.webp`),
        width: size.width,
        quality: size.quality,
      })),
      { force: FORCE },
    );
    for (const size of sizes) {
      const target = path.join(dir, `${photo.name}${size.suffix}.webp`);
      const meta = await sharp(target).metadata();
      const { size: bytes } = await stat(target);
      total += bytes;
      console.log(
        `/pages/${page.slug}/${photo.name}${size.suffix}.webp  ${meta.width}×${meta.height}  ${(bytes / 1024).toFixed(1)} KB`,
      );
    }
  }
}

console.log(`${(total / 1024).toFixed(1)} KB in public/pages`);
