# Mănăstirea Saharna — website v2

v2 restyles the v1 site (github.com/49shamans7/manastirea-saharna, unchanged)
to the temple designs in `design/prototypes/` (open `design/prototypes/index.html`).
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
| `scripts/` | photo pipeline, imports, favicons, search index, link check |
| `design/temple/` | design canon: zones, palettes, typography (`ARCHITECTURE.md`) |
| `design/source/` | source art (the 4140px seal master) |
| `docs/DEVELOPING.md` | how to run, test, and where to edit what |
| `apps/cms/`, `workers/pomelnic/`, `.github/workflows/deploy.yml` | previous developer's infrastructure — untouched until the Cloudflare switch |

Photos are derived from the archive of the old site in `~/Projects/msaharna-archive`
(2.6 GB, never committed).
