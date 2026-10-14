// Derives post photographs from the archive into the site.
//
// Per entry: the lead photograph in three widths (1400 / 800 / 480), and up
// to GALLERY_CAP further photographs as gallery plates (800 + 360 thumb).
// The archive holds 5,210 post photographs — all of them would be ~480 MB at
// these sizes, which is a decision about the repository, not about the
// design; the cap keeps public/posts near 160 MB. Raise it deliberately.
//
//   bun scripts/build-post-media.mjs                 (after import-posts.mjs)
//   bun scripts/build-post-media.mjs --no-galleries  (lead photographs only)
//   bun scripts/build-post-media.mjs --force         (re-derive everything)
//
// Every derivative goes through scripts/lib/restore.mjs (the house restoration
// grade) and is written as .webp.
// Existing derivatives are reused; delete a post's folder or pass --force.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { restore } from "./lib/restore.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const OUT = path.join(ROOT, "apps/client/public/posts");
const CONTENT = path.join(ROOT, "apps/client/src/content/posts");

const WITH_GALLERIES = !process.argv.includes("--no-galleries");
const FORCE = process.argv.includes("--force");
const GALLERY_CAP = 6;

const LEAD = { width: 1400, quality: 80 };
const MEDIUM = { width: 800, quality: 72 };
const THUMB = { width: 480, quality: 72 };
const PLATE = { width: 800, quality: 70 };
const PLATE_THUMB = { width: 360, quality: 65 };

/** https://…/wp-content/uploads/2014/04/1-1.jpg → <archive>/media/images/2014/04/1-1.jpg */
function localSource(url) {
  const tail = url.replace(/^.*\/uploads\//, ""); // the archive keeps names percent-encoded on disk

  return path.join(ARCHIVE, "media/images", tail);
}

function nameOf(url) {
  return path
    .basename(url, path.extname(url))
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

/** Size of the source as displayed (EXIF orientation applied), or null if it is not an image. */
async function sizeOf(source) {
  try {
    const meta = await sharp(source, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) return null;
    const turned = (meta.orientation ?? 1) >= 5;

    return turned ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height };
  } catch {
    return null; // the archive has a few HTML error pages saved as .jpg
  }
}

/** Restore `source` into [file, {width, quality}] pairs — one decode, webp each. */
async function derive(source, targets) {
  try {
    const done = await restore(
      source,
      targets.map(([file, { width, quality }]) => ({ file, width, quality })),
      { force: FORCE },
    );

    return done !== null;
  } catch {
    return false;
  }
}

/** Display size of a derivative of `size` at `width`. */
function scaled(size, width) {
  const w = Math.min(width, size.width);

  return { width: w, height: Math.round((size.height * w) / size.width) };
}

const manifest = JSON.parse(await readFile(path.join(ROOT, "scripts/post-images.json"), "utf8"));

let leads = 0;
let plates = 0;
const unreadable = [];

for (const post of manifest) {
  const locale = post.locale ?? "ro";
  const file = path.join(CONTENT, locale, `${post.slug}.md`);
  if (!(await exists(file)) || post.images.length === 0) continue;

  // Romanian media live at /posts/<slug>/, a translation's at /posts/<locale>/<slug>/.
  const folder = locale === "ro" ? post.slug : `${locale}/${post.slug}`;
  const dir = path.join(OUT, folder);
  const usable = [];

  for (const url of post.images) {
    if (!WITH_GALLERIES && usable.length) break;
    if (usable.length > GALLERY_CAP) break;
    const source = localSource(url);
    const size = await sizeOf(source);
    if (size) usable.push({ url, source, size, name: nameOf(url) });
    else unreadable.push(`${post.slug}: ${url}`);
  }

  if (usable.length === 0) continue;
  await mkdir(dir, { recursive: true });

  const [lead, ...rest] = usable;
  const base = `/posts/${folder}/${lead.name}`;
  const ok = await derive(lead.source, [
    [path.join(dir, `${lead.name}.webp`), LEAD],
    [path.join(dir, `${lead.name}-800.webp`), MEDIUM],
    [path.join(dir, `${lead.name}-thumb.webp`), THUMB],
  ]);
  if (!ok) continue;
  leads += 1;

  const full = scaled(lead.size, LEAD.width);
  const imageBlock = [
    "image:",
    `  src: ${base}.webp`,
    `  medium: ${base}-800.webp`,
    `  thumb: ${base}-thumb.webp`,
    `  width: ${full.width}`,
    `  height: ${full.height}`,
    '  alt: ""',
  ];

  const gallery = [];
  const taken = new Set([lead.name]);
  for (const plate of rest.slice(0, GALLERY_CAP)) {
    // two uploads can share a basename across months; a reused name would
    // silently reuse the other photograph's derivative
    let name = plate.name;
    for (let n = 2; taken.has(name); n += 1) name = `${plate.name}-${n}`;
    taken.add(name);
    const okPlate = await derive(plate.source, [
      [path.join(dir, `${name}.webp`), PLATE],
      [path.join(dir, `${name}-sm.webp`), PLATE_THUMB],
    ]);
    if (!okPlate) continue;
    const size = scaled(plate.size, PLATE.width);
    gallery.push(
      [
        `  - src: /posts/${folder}/${name}.webp`,
        `    thumb: /posts/${folder}/${name}-sm.webp`,
        `    width: ${size.width}`,
        `    height: ${size.height}`,
      ].join("\n"),
    );
    plates += 1;
  }

  // Point the entry at what now exists on disk.
  // Only entries still at `image: null` are touched; a re-run leaves the rest alone.
  const markdown = await readFile(file, "utf8");
  const block = [...imageBlock, ...(gallery.length ? ["galleryImages:", ...gallery] : [])].join("\n");
  const next = markdown.replace(/^image: null$/m, block);
  if (next !== markdown) await writeFile(file, next);
}

console.log(`${leads} lead photographs`);
if (WITH_GALLERIES) console.log(`${plates} gallery plates (cap ${GALLERY_CAP}/post)`);
if (unreadable.length)
  console.log(`${unreadable.length} archive files that are not images:\n  ${unreadable.join("\n  ")}`);
