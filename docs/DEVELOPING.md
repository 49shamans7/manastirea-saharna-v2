# Developing the Saharna site

A static site: Astro builds every page to plain HTML at build time. There is no
server, no database and no CMS. The "backend" is markdown files in the repo plus
one small form worker.

## Run it

```sh
cd ~/Projects/msaharna
bun install                      # once, after pulling
bun run dev:client               # http://localhost:4321/manastirea-saharna-v2/
```

The dev server does not watch `public/posts`, `public/gallery`, `public/pages` or
`public/fisiere`: about 9,000 files there exhausted file handles and killed it.
After regenerating photos with a script, restart the dev server.

## Check and test

| Command (from `apps/client`) | What it checks |
|---|---|
| `bun astro check` | TypeScript and Astro types. Must say 0 errors. |
| `bun run build` | Full build, then the search index and CSP hashes. About 15–30 s, peaks at about 700 MB. |
| `OUT_DIR=../../.work/dist bun astro build` | Build somewhere other than `dist/`. |
| `node ../../scripts/shot.mjs <url> out.png 390 844 [--full]` | Real-Chrome screenshot. Prints sideways overflow, console errors and image KB. Use 390×844 and 360×780 for phones, 1440×900 for desktop. |
| `node ../../scripts/check-links.mjs dist` | Internal link check on a build: every link and image must exist. |

Before you call a change done: `astro check` is clean, the page looks right at 390
and 1440, and no page scrolls sideways (`overflowX: 0` from `shot.mjs`).

## Where things live (`apps/client/src`)

| You want to change… | Edit |
|---|---|
| Colours, spacing, rule widths, motion speed (the solid system) | `styles/global.css`, the tokens on `:root` (`--s-*`, `--rule`, `--bar`, `--dur-*`, `--tap`) |
| Which pages exist in each zone, and their order in the left rail, drawer and footer | `temple/zones.ts`, the only list |
| Any UI text in ro/en/ru | `i18n/index.ts`. Every key must exist in all three. |
| A chamber page's text (Istoria, Macarie, Cronologia, Starețul…) | `content/pages/ro/<slug>.md`. en/ru files hold translated titles; the body falls back to Romanian. |
| A news post | `content/posts/ro/<slug>.md` (305 files). New file = new post. |
| The service schedule, and its en/ru names | `data/schedule.ts` |
| Home page (the descent) | `pages/index.astro` (one file; `components/descent/` keeps only Band, Panel, Well for `/walk`) |
| The frame: left rail, calendar rail, phone drawer | `layouts/TempleFrame.astro`, `components/temple/*` (DescentRail, CalendarRail, RailDrawer) |
| Templates | `layouts/Chamber.astro` (reading pages), `layouts/TableLayout.astro` (practical pages), `layouts/Layout.astro` (the `<head>`) |
| Header and footer | `components/Navbar.astro`, `components/SiteFooter.astro` |
| Seal, mini medallion, icons, cross | `components/marks/*`. The icon paths are in `icons.ts`; the seal is `assets/marks/seal.svg`. |
| Gallery page and its photo list | `pages/galerie.astro`, `data/gallery.json` |
| Search page | `pages/cautare.astro` (Pagefind, built after the site) |
| Contact, donations, directions | `pages/contact.astro`, `donations.astro`, `cum-de-ajuns.astro` |

The design canon (zones, palettes, why the page darkens downward) is in
`design/temple/ARCHITECTURE.md`. Read it before changing structure.

## Photos (`scripts/`, Node + sharp)

The originals live outside the repo in `~/Projects/msaharna-archive` (2.6 GB, never
commit them). Scripts derive web sizes (WebP) through one restoration grade
in `scripts/lib/restore.mjs` (neutral colour, haze lift, no generation).

| Script | Makes |
|---|---|
| `build-post-media.mjs` | `public/posts/**`: lead photo 1400/800/480 and gallery 800/360, up to 6 per post |
| `build-gallery.mjs`, then `build-gallery-curated.mjs` | `public/gallery/**` + `data/gallery.json`, including square tiles. Fixed crops are in `FOCUS` in `scripts/lib/gallery.mjs`. |
| `build-plates.mjs`, `build-obstea.mjs`, `build-page-media.mjs` | Zone backgrounds, Obștea portraits, page photos |
| `build-favicons.mjs`, `build-icon-css.mjs` | Favicons from the SVG seal; CSS masks from `icons.ts` |
| `import-posts.mjs`, `import-pages.mjs` | Re-import text from the archive (overwrites the markdown) |
| `build-redirects.mjs` | `public/_redirects`: old WordPress URLs → new routes |

Run them from `apps/client`, for example `node ../../scripts/build-plates.mjs`. Run one at a
time: the Mac has 8 GB.

## The form backend

`workers/saharna-pomelnic/` is the Pomelnic form as a Cloudflare Worker. It is not
deployed and has no secrets set. `workers/pomelnic/`, `apps/cms/` and `deploy.yml`
belong to the previous developer's accounts: leave them alone until the Cloudflare
switch (see `CLEANUP-AT-SWITCH` notes when written).

## Hosting

Today: GitHub Pages at `/manastirea-saharna-v2`. Planned: Cloudflare on the monastery's
account. `apps/client/wrangler.jsonc` is ready; `bun run build:cloudflare` builds
for the domain root.
