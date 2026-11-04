# saharna-pomelnic

The Pomelnic form's backend. Accepts the form POST, checks Turnstile, and sends
the old site's fields to the monastery as one plain-text mail through Cloudflare's
`send_email` binding, with Reply-To set to the sender. It stores nothing and logs
only outcomes and error codes.

| Setting | Kind | Value |
|---|---|---|
| `ALLOWED_ORIGINS` | var | sites that may post; the `*.workers.dev` preview is derived |
| `POMELNIC_TO` | var | must be a verified destination address in the account |
| `POMELNIC_FROM` | var | on `formular.manastirea-saharna.md`, the sending subdomain |
| `TURNSTILE_SECRET_KEY` | secret | set by `bun run cloudflare:setup` |
| `EMAIL` | binding | `send_email` |

`bun run cloudflare:setup` deploys all of it (`docs/CLOUDFLARE-HANDOVER.md`).

`bun run check:workers` runs the typecheck and the tests.

After a submission the visitor returns to the page they came from with
`?pomelnic=ok|invalid|challenge|send`.
