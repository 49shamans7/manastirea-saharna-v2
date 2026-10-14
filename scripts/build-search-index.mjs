// Pagefind over the built site — the postbuild step of apps/client.
//
//   bun ../../scripts/build-search-index.mjs [outDir]
//
// outDir: argument, else $OUT_DIR, else apps/client/dist. The bundle lands in
// <outDir>/pagefind/ and is served at <BASE>/pagefind/ — Pagefind derives its
// base URL from the bundle's own path, so the same index works under
// /manastirea-saharna-v2/ (GitHub Pages) and under / (the monastery's domain).
//
// LANGUAGE: one index per <html lang> (ro / en / ru). /cautare/ loads the
// Romanian index, /en/cautare/ the English one, /ru/cautare/ the Russian one —
// the language filter is the index itself.
//
// WHAT IS INDEXED: only <main> (rootSelector) — never the header, rails,
// drawer, pomelnic modal or footer, which repeat on every page. Once the
// layouts carry data-pagefind-body (.work/stack/INTEGRATION.md) Pagefind
// narrows to those elements by itself; nothing here needs to change.
//
// WHAT IS SKIPPED (by path):
//   ro/**                astro-i18n-aut's redirect stubs (no <html>, no text)
//   404, cautare         no content of their own
//   posts/, posts/page/N, posts/an/YYYY   lists of excerpts — every entry is
//                        indexed once, on its own page
//   pagefind/**          the bundle itself
//
// FILTER + META added at index time (the HTML on disk is not touched):
//   section: posts | pages   → the chips on /cautare/
//   date: the post's eyebrow (Chamber's .label) → shown under each result
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as pagefind from "pagefind";

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.argv[2] || process.env.OUT_DIR || path.join(here, "../apps/client/dist"));

const SKIP = [
  /^ro\//,
  /^pagefind\//,
  /^admin\//,
  /^(?:(?:en|ru)\/)?404(?:\/index)?\.html$/,
  /^(?:(?:en|ru)\/)?cautare\/index\.html$/,
  /^(?:(?:en|ru)\/)?posts\/(?:index\.html|page\/|an\/)/,
];
const POST = /^(?:(?:en|ru)\/)?posts\/[^/]+\/index\.html$/;

async function htmlFiles(dir, rel = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await htmlFiles(path.join(dir, entry.name), relPath)));
    else if (entry.name.endsWith(".html")) out.push(relPath);
  }
  return out;
}

/** Tag a page for the section filter (and a post with its date) before indexing. */
function annotate(rel, html) {
  const isPost = POST.test(rel);
  let out = html.replace(/<main\b/, `<main data-pagefind-filter="section:${isPost ? "posts" : "pages"}"`);
  if (isPost) out = out.replace(/<p class="label"/, '<p data-pagefind-meta="date" data-pagefind-ignore class="label"');
  return out;
}

const started = Date.now();
await rm(path.join(site, "pagefind"), { recursive: true, force: true });

const { index, errors: createErrors } = await pagefind.createIndex({ rootSelector: "main" });
if (!index) throw new Error(`pagefind: could not create an index — ${createErrors.join("; ")}`);

const files = (await htmlFiles(site)).filter((rel) => !SKIP.some((re) => re.test(rel)));
let pages = 0;
for (const rel of files) {
  const html = await readFile(path.join(site, rel), "utf8");
  if (!/<main\b/.test(html)) continue;
  const { errors } = await index.addHTMLFile({
    url: `/${rel.replace(/(?:^|\/)index\.html$/, "/").replace(/^\/+/, "")}`.replace(/\/{2,}/g, "/"),
    content: annotate(rel, html),
  });
  if (errors.length) throw new Error(`pagefind: ${rel}: ${errors.join("; ")}`);
  pages += 1;
}
if (!pages) throw new Error(`pagefind: no pages found in ${site} — build first`);

const written = await index.writeFiles({ outputPath: path.join(site, "pagefind") });
if (written.errors.length) throw new Error(`pagefind: ${written.errors.join("; ")}`);

await pagefind.close();
console.log(
  `pagefind: ${pages} pages indexed (${files.length - pages} without <main> skipped) → ${path.relative(process.cwd(), written.outputPath)} (${Date.now() - started} ms)`,
);
