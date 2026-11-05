# Mănăstirea Saharna — website v2

The new site for manastirea-saharna.md: the old site's content 1:1 on a new frontend and backend.
Preview: https://49shamans7.github.io/manastirea-saharna-v2/

Static site for the Holy Trinity Monastery of Saharna (Rezina, Moldova), in
Romanian, English and Russian. Astro builds every page to plain HTML; content is
markdown in this repo. No server, no database.

```sh
bun install
bun run dev:client     # http://localhost:4321/manastirea-saharna-v2/
bun run build:client   # full build + search index
```

| Folder | What |
|---|---|
| `apps/client/` | the website (Astro) |
| `workers/saharna-pomelnic/` | Pomelnic form backend (Cloudflare Worker, not deployed yet) |
| `workers/sveltia-cms-auth/` | GitHub sign-in for `/admin` (Cloudflare Worker, not deployed yet) |
| `scripts/` | photo pipeline, imports, favicons, search index, link check |
| `design/temple/` | design canon: zones, palettes, typography (`ARCHITECTURE.md`) |
| `design/source/` | source art (the 4140px seal master) |
| `docs/DEVELOPING.md` | how to run, test, and where to edit what |
| `apps/cms/`, `workers/pomelnic/` | previous developer's code: never use its accounts |

Photos are derived from the old site's images in `~/Projects/msaharna-archive`
(2.5 GB, never committed). Moving to Cloudflare: `docs/CLOUDFLARE-HANDOVER.md`.
Editing the site: `docs/ADMIN.md`.
