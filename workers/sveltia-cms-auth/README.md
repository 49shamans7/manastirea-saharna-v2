# sveltia-cms-auth

OAuth relay for the "Sign in with GitHub" button in `/admin/`. `src/index.js` is
the upstream file, unmodified (commit `33500e1`, MIT). It stores nothing.

`bun run cloudflare:setup` deploys it. By hand: `docs/ADMIN.md`.
