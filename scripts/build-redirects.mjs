// Old WordPress URLs → the new routes, as a Cloudflare `_redirects` file.
//
//   bun scripts/build-redirects.mjs [distDir]
//
// Writes apps/client/public/_redirects (commit the result). With a distDir
// (a build made with BASE_PATH=/), every target is checked against the built
// files and the script fails on a target that does not exist.
//
// Sources:
//   - the 27 old pages: the coverage table below (each new chamber's own
//     frontmatter `sourceUrl` agrees with it)
//   - the 306 old posts: every src/content/posts/**.md carries the WordPress
//     `sourceUrl` it was imported from; the new route is /posts/<file slug>/
//     (data/posts.ts slugOf = the file name), under /ru/ for a Russian-only post
//   - WordPress also answered /<post-slug>/ at the root (redirect_guess), and
//     links in the wild use it: those map too, unless the slug is a new route
//   - categories, authors, the video archive, feeds, pagination → the chronicle
//
// Redirects assume the production domain at the root (BASE_PATH=/).
// Cloudflare limits: 2000 static + 100 dynamic rules; static rules come first.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const client = path.join(here, "../apps/client");
const dist = process.argv[2] ? path.resolve(process.argv[2]) : null;

/** old WordPress page path → new route (the coverage table) */
const PAGES = {
  "/a-c-a-t-i-s-t-u-l-preacuviosului-si-de-dumnezeu-purtatorului-parintelui-nostru-macarie-de-la-saharna/":
    "/acatistul/",
  "/album-foto/": "/galerie/",
  "/biserica-nasterea-maicii-domnului/": "/nasterea-maicii-domnului/",
  "/biserica-sfanta-treime/": "/sfanta-treime/",
  "/casa-de-oaspeti-sfantul-avraam/": "/cazare/",
  "/contacte/": "/contact/",
  // "Întreabă preotul" was a menu item; the page was never archived
  "/intreaba-preotul/": "/contact/",
  "/cronica/": "/cronologie/",
  "/donatii/": "/donations/",
  "/donation-confirmation/": "/donations/",
  "/donation-failed/": "/donations/",
  "/donor-dashboard/": "/donations/",
  "/imagini-de-ansamblu/": "/galerie/#complex-overview",
  "/istoria-sfintei-manastiri/": "/istoria/",
  "/manastirea-rupestra-bunavestirea/": "/bunavestirea/",
  "/moastele-sfantului-macarie/": "/moastele/",
  "/programul-sfintelor-slujbe/": "/slujbe/",
  "/slujba-cuviosului-macarie/": "/slujba/",
  "/trimite-un-pomelnic/": "/pomelnic/",
  "/viata-cuviosului-macarie/": "/macarie/",
  "/viata-si-activitatea-preacuviosului-egumen-macarie-tincu-de-la-manastirea-sf-treime-saharna/": "/macarie/",
  // kept their address: /biblioteca/ /cum-de-ajuns/ /mitropolitul/ /obstea/ /prezentare/ /staretul/
};

/** archive listings → the chronicle */
const LISTINGS = {
  "/stiri-si-evenimente/": "/posts/",
  "/video/": "/posts/",
  "/category/stiri-si-evenimente/": "/posts/",
  "/category/articole-si-interviuri/": "/posts/",
  "/category/cuvinte-duhovniceti/": "/posts/",
  "/category/predici-si-cuvantari/": "/posts/",
  "/category/video/": "/posts/",
  "/author/iuvenalie-parintele/": "/posts/",
  "/author/preot-mihail-borta/": "/posts/",
  "/feed/": "/rss.xml",
  "/comments/feed/": "/rss.xml",
};

/** dynamic catch-alls, after every static rule */
const DYNAMIC = [
  // every known entry is a static rule above; anything else lands on the chronicle
  ["/stiri-si-evenimente/*", "/posts/"],
  ["/video/*", "/posts/"],
  ["/category/*", "/posts/"],
  ["/author/*", "/posts/"],
  ["/tag/*", "/posts/"],
  ["/page/*", "/posts/"],
  ["/feed/*", "/rss.xml"],
  ["/wp-admin/*", "/"],
  ["/wp-login.php", "/"],
];

function frontmatterValue(file, key) {
  const match = readFileSync(file, "utf8").match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"));
  return match ? match[1].trim() : undefined;
}

/**
 * Every spelling a visitor or crawler may send: with and without the trailing
 * slash (Cloudflare matches the path exactly), and upper/lower-case escapes.
 */
function spellings(p) {
  const out = new Set([p]);
  if (p.length > 1 && p.endsWith("/")) out.add(p.slice(0, -1));
  if (/%[0-9a-f]{2}/i.test(p)) {
    for (const q of [...out]) {
      out.add(q.replace(/%[0-9a-f]{2}/gi, (m) => m.toUpperCase()));
      out.add(q.replace(/%[0-9a-f]{2}/gi, (m) => m.toLowerCase()));
    }
  }
  return [...out];
}

const rules = new Map(); // source → target (first one wins)
const add = (from, to) => {
  for (const source of spellings(from)) if (!rules.has(source) && source !== to) rules.set(source, to);
};

for (const [from, to] of Object.entries(PAGES)) add(from, to);

// every route the new site has at the root — a root /<slug>/ alias must not shadow one
const routes = new Set(readdirSync(path.join(client, "src/content/pages/ro")).map((f) => f.replace(/\.md$/, "")));
for (const f of readdirSync(path.join(client, "src/pages"))) {
  const name = f.replace(/\.(astro|ts)$/, "");
  if (!name.startsWith("[") && !name.startsWith("_")) routes.add(name);
}
for (const p of [
  "posts",
  "en",
  "ru",
  "ro",
  "pagefind",
  "_astro",
  "gallery",
  "plates",
  "pages",
  "obstea",
  "hero",
  "images",
  "fisiere",
])
  routes.add(p);

const posts = [];
for (const locale of ["ro", "en", "ru"]) {
  const dir = path.join(client, "src/content/posts", locale);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const source = frontmatterValue(path.join(dir, file), "sourceUrl");
    if (!source) continue;
    // a Russian-only entry lives under /ru/; one with a Romanian original keeps the Romanian route
    const hasRo = existsSync(path.join(client, "src/content/posts/ro", file));
    const target =
      locale === "ro" || !hasRo ? `${locale === "ro" ? "" : `/${locale}`}/posts/${slug}/` : `/posts/${slug}/`;
    posts.push({ oldPath: new URL(source).pathname, slug, target });
  }
}
posts.sort((a, b) => a.oldPath.localeCompare(b.oldPath));
for (const { oldPath, target } of posts) add(oldPath, target);

for (const [from, to] of Object.entries(LISTINGS)) add(from, to);

// WordPress's /<slug>/ guesses at the root
let rootAliases = 0;
for (const { oldPath, target } of posts) {
  const last = oldPath.split("/").filter(Boolean).pop();
  if (!last || routes.has(decodeURIComponent(last))) continue;
  const before = rules.size;
  add(`/${last}/`, target);
  if (rules.size > before) rootAliases += 1;
}

// verify against a root build
const missing = [];
if (dist) {
  for (const to of new Set([...rules.values(), ...DYNAMIC.map(([, to]) => to).filter((t) => !t.includes(":"))])) {
    const file = to.split("#")[0];
    const onDisk = file.endsWith("/") ? path.join(dist, file, "index.html") : path.join(dist, file);
    if (!existsSync(onDisk)) missing.push(to);
  }
  if (missing.length) {
    console.error(`build-redirects: ${missing.length} target(s) missing in ${dist}:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
}

const staticCount = rules.size;
if (staticCount > 2000 || DYNAMIC.length > 100)
  throw new Error(`too many rules: ${staticCount} static, ${DYNAMIC.length} dynamic`);

const lines = [
  "# Old WordPress URLs (manastirea-saharna.md, 2013–2026) → the new routes.",
  "# GENERATED by scripts/build-redirects.mjs — edit the script, not this file.",
  `# ${Object.keys(PAGES).length} pages · ${posts.length} posts · ${rootAliases} root aliases · ${Object.keys(LISTINGS).length} listings · ${DYNAMIC.length} dynamic`,
  "# Assumes the site at the domain root (BASE_PATH=/). 301 = permanent.",
  "",
  ...[...rules].map(([from, to]) => `${from} ${to} 301`),
  "",
  "# catch-alls (after every static rule)",
  ...DYNAMIC.map(([from, to]) => `${from} ${to} 301`),
  "",
];
writeFileSync(path.join(client, "public/_redirects"), lines.join("\n"));
console.log(
  `build-redirects: ${staticCount} static + ${DYNAMIC.length} dynamic → apps/client/public/_redirects${dist ? " (all targets verified)" : ""}`,
);
