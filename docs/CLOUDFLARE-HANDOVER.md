# Cloudflare handover

The switch from GitHub Pages and the old WordPress to the monastery's own
Cloudflare account. Cloudflare is the only new account: no Resend, no mail service.
Nothing here has been run on a real account yet.

## What the owner does

- [ ] **1. Account.** Create a free Cloudflare account, or log into the one that
      already holds `manastirea-saharna.md` (see *The zone*).
- [ ] **2. Log in.** From the repo root: `bunx wrangler login`
- [ ] **3. One command.** `bun run cloudflare:setup`. It asks you to type the account
      name, then to answer a few questions.
- [ ] **4. Confirm DNS.** The command prints the DNS as it stands, keeps a copy in
      `.work/`, and asks twice: once for the mail subdomain, once for the switch.
      Look at the workers.dev preview before you type the domain.
- [ ] **5. Secretary.** Someone with access to `secretariat@manastirea-saharna.md`
      clicks the link in the Cloudflare verification mail.
- [ ] **6. Test.** Send one pomelnic from the site and confirm it arrives.

`bun run cloudflare:setup --dry-run` prints every step and touches no account. The
real run is safe to repeat: it skips what exists and picks up what was declined.

## What the command does

| Step | Result |
|---|---|
| Account | stops unless you confirm it by typing its name; refuses the previous developer's |
| Zone | finds `manastirea-saharna.md` in the account |
| Worker | deploys `workers/saharna-pomelnic` |
| Turnstile | creates the widget through wrangler, puts its secret on the worker |
| Mail | registers `POMELNIC_TO` as a destination, enables sending on `formular.manastirea-saharna.md` |
| Admin sign-in | optional: `workers/sveltia-cms-auth` (`docs/ADMIN.md`) |
| Site | writes `PUBLIC_POMELNIC_WORKER_URL` and `PUBLIC_TURNSTILE_SITE_KEY` to `apps/client/.env`, builds for the domain root, deploys as Workers static assets |
| Domain | attaches the apex and `www.` |
| GitHub | sets the two variables and two secrets through `gh`; you create one API token (template **Edit Cloudflare Workers**) and paste it |

After that, `.github/workflows/deploy-cloudflare.yml` publishes every push, so
admin saves reach the site. It does nothing until those secrets exist.

## The zone

The domain is already on Cloudflare (`greg` / `kim.ns.cloudflare.com`), in an account
nobody has identified yet. The command tells you if the zone is not in yours. The
site and the worker still deploy to workers.dev, but mail and the domain wait until
the holder moves the zone to your account, or you add it and change the nameservers
at the registrar. In that second case, check the imported records against the export
before you change anything.

## Mail

DNS on 2026-11-04: `MX 10 mail.manastirea-saharna.md` → `188.40.51.250`, which is
`hosting1.prohosting.md`; `webmail.` is the same host. SPF is
`v=spf1 +a +mx +a:hosting1.prohosting.md -all`, DMARC `p=none`.

- **The monastery's mailboxes live on the old hosting. Do not cancel it** when the
  WordPress goes, unless the mail has moved first.
- **Never enable Email Routing on the domain itself.** It replaces that MX and the
  mailboxes stop receiving. The setup uses a subdomain, so the root records stay.
- The form sends through the Worker `send_email` binding to a verified destination
  address, which Cloudflare's docs call free on every plan. Its pricing table also
  lists Email Sending as Workers Paid. If Cloudflare refuses the subdomain on the free
  plan, the command prints the alternative: Email Routing on the subdomain (free,
  dashboard), or Workers Paid.
- `POMELNIC_TO` is in `workers/saharna-pomelnic/wrangler.jsonc`. If it changes, run
  the command again and verify the new address.

## After the switch

- GitHub → Settings → Pages → disable, delete `.github/workflows/deploy.yml`, and drop
  `https://49shamans7.github.io` from `ALLOWED_ORIGINS` and `49shamans7.github.io`
  from `ALLOWED_DOMAINS`.
- `apps/client/public/_redirects` holds the old WordPress URLs and works only on the
  root build. `bun run redirects` regenerates it.
