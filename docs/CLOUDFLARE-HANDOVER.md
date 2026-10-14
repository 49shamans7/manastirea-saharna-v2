# Cloudflare handover

The switch from GitHub Pages to the monastery's own Cloudflare account. One
session with the account holder logged in, about 60–90 minutes, most of it
waiting for DNS. Nothing here has been run yet.

Everything is prepared in the repo:

| File | Role |
|---|---|
| `apps/client/wrangler.jsonc` | the site as Workers static assets (`bun run build:cloudflare` → `dist/`) |
| `apps/client/public/_headers` | caching + security headers (CSP hashes filled in at build) |
| `apps/client/public/_redirects` | ~1,300 old WordPress URLs → new routes (`bun run redirects` regenerates) |
| `workers/saharna-pomelnic/` | the Pomelnic form backend (Turnstile check, mail through Resend) |

## Before the session

- [ ] Who controls the domain `manastirea-saharna.md` today (registrar login)?
- [ ] **The domain is already on Cloudflare** (checked 2026-10-10: nameservers
      `greg.ns.cloudflare.com` / `kim.ns.cloudflare.com`, proxying the old
      WordPress). Find out whose Cloudflare account holds that zone. If the
      monastery can log into it, use that account for everything below and skip
      step 6.1/6.3 (the zone is already there). If it is the previous developer's
      or the old host's, either get the zone moved to the monastery's account
      (Cloudflare → zone → *Move domain*) or re-add it there and switch nameservers.
- [ ] **Email on the domain.** `info@` and `secretariat@manastirea-saharna.md` are
      in use. Export the current DNS records (MX, SPF, DKIM, any TXT) first. If
      they are lost in the move, the monastery's email stops.
- [ ] The address pomelnice should go to (`POMELNIC_TO`).

## 1. Account and login (5 min)

```sh
cd ~/Projects/msaharna/apps/client
bunx wrangler login            # the monastery's Cloudflare account
bunx wrangler whoami           # confirm the account name
```

## 2. Deploy the site on workers.dev (5 min)

```sh
bunx wrangler deploy           # builds for the domain root and uploads dist/
```

Open the printed `*.workers.dev` URL and check home, a post, /galerie, /cautare,
and an old URL such as `/istoria-sfintei-manastiri/` (must redirect to `/istoria/`).

## 3. Turnstile (5 min)

Dashboard → Turnstile → Add site → domain `manastirea-saharna.md` (+ the
workers.dev host while testing). Keep the **site key** (public) and the
**secret key**.

## 4. Mail through Resend (15 min + DNS wait)

Resend account (the monastery's) → Domains → add `manastirea-saharna.md` → it
lists SPF/DKIM records. Add them in step 6, then verify. Create an API key.

## 5. The Pomelnic worker (10 min)

```sh
cd ~/Projects/msaharna/workers/saharna-pomelnic
# wrangler.jsonc: POMELNIC_TO = the monastery address,
#                 ALLOWED_ORIGIN = https://manastirea-saharna.md,
#                 SITE_URL       = https://manastirea-saharna.md
bunx wrangler secret put RESEND_API_KEY
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler deploy
```

## 6. Domain (15 min + up to 24 h propagation)

1. Cloudflare → Add a site → `manastirea-saharna.md` → Free plan.
2. **Check the imported DNS records against the export from "Before"**: MX, SPF,
   DKIM must all be there. Add Resend's records from step 4.
3. At the registrar, switch the nameservers to the two Cloudflare gives.
4. When the zone shows **Active**: in `apps/client/wrangler.jsonc` uncomment the
   `routes` block, then `bunx wrangler deploy` again. That attaches
   `manastirea-saharna.md` and `www.` with certificates.

## 7. Wire the form and redeploy (5 min)

`apps/client/.env`:

```sh
PUBLIC_POMELNIC_WORKER_URL=https://saharna-pomelnic.<subdomain>.workers.dev
PUBLIC_TURNSTILE_SITE_KEY=<site key from step 3>
```

`bunx wrangler deploy`, then send a test pomelnic and confirm it arrives.

## 8. Analytics (2 min)

Dashboard → Web Analytics → enable for the domain (no cookies, no banner).

## 9. Switch off the old path, then clean the repo

- GitHub repo → Settings → Pages → disable. Delete `.github/workflows/deploy.yml`.
- Delete the previous developer's infrastructure, which nothing uses any more:
  `apps/cms/`, `workers/pomelnic/`, `.github/workflows/deploy-worker.yml`,
  the `dev:cms` / `build:cms` scripts and the `apps/*` workspace glob in the root
  `package.json` (→ `apps/client`).
- Delete `workers/pomelnic/` only — `deploy-worker.yml` now deploys
  `workers/saharna-pomelnic/` and stays.

## 10. Deploy on every push — required for the admin (5 min)

`.github/workflows/deploy-cloudflare.yml` is already in the repo and skips
itself until it has credentials. Each save in `/admin` is a push to `dev`, so
without this the admin's edits would not reach the live site.

1. Cloudflare → My Profile → API Tokens → *Create token* → template
   **Edit Cloudflare Workers** → limited to the monastery account.
2. GitHub repo → Settings → Secrets and variables → Actions:
   - secret `CLOUDFLARE_API_TOKEN` = that token
   - secret `CLOUDFLARE_ACCOUNT_ID` = the account id (`bunx wrangler whoami`)
   - variables `PUBLIC_POMELNIC_WORKER_URL`, `PUBLIC_TURNSTILE_SITE_KEY` (step 7)
3. Actions → *Deploy to Cloudflare* → Run workflow. From then on every push deploys.
