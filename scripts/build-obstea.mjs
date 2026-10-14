// The brotherhood portraits. Three full-obște group photographs, one per year,
// and the abbot's portrait. Mapped positionally off the old obstea page, whose
// own headings read "Clerul Sfintei Mănăstiri. 2012 / 2013 / 2014".
//
// They are 1200×800 — above the 800px ceiling the album pages sit at, so
// these are not derivatives of the scrape.
//
// Each year frame also gets a 640w variant (obstea.astro's srcset). All go
// through scripts/lib/restore.mjs (house grade), webp.
//
//   bun scripts/build-obstea.mjs
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { restore } from "./lib/restore.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const OUT = path.join(ROOT, "apps/client/public/obstea");

const FRAMES = [
  // Each year is a different season and a different vestment colour. Stacked
  // in order they read green → blue → black, summer → snow → bare: a descent
  // into shade, which is the site's own movement rather than an ornament.
  { name: "2012", from: "media/images/2014/06/Image00001.jpg", small: true },
  { name: "2013", from: "media/images/2014/06/Image00002.jpg", small: true },
  { name: "2014", from: "media/images/2014/06/Image00003.jpg", small: true },
  { name: "staretul", from: "media/images/2014/06/Image00004-e1504010221267.jpg" },
];

await mkdir(OUT, { recursive: true });

for (const frame of FRAMES) {
  const source = path.join(ARCHIVE, frame.from);
  const meta = await sharp(source).metadata();

  const outputs = [{ file: path.join(OUT, `${frame.name}.webp`), width: 1400, quality: 82 }];
  if (frame.small) outputs.push({ file: path.join(OUT, `${frame.name}-640.webp`), width: 640, quality: 78 });
  await restore(source, outputs, { force: true });

  console.log(`${frame.name.padEnd(10)} ${meta.width}x${meta.height}`);
}
