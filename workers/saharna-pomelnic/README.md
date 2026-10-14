# saharna-pomelnic

The pomelnic mail worker, on the monastery's own infrastructure.

This is a **copy of the architecture** in `workers/pomelnic`, not a replacement
for it. That worker, its vars and its deployment are left untouched.

## What it does

Accepts the pomelnic form POST, verifies the Turnstile token, and relays the
names to the monastery by email through Resend. It stores nothing.

## Setup

```sh
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler deploy
```

Then set `POMELNIC_TO` in `wrangler.jsonc` to the monastery address, and point
the client at the deployed worker:

```sh
# apps/client/.env
PUBLIC_POMELNIC_WORKER_URL=https://saharna-pomelnic.<subdomain>.workers.dev
PUBLIC_TURNSTILE_SITE_KEY=<site key>
```

`ALLOWED_ORIGIN` and `SITE_URL` must match where the site is actually served,
or the worker answers 403 — that is what it is for.
