# Admin — publishing without the developer

The site has an editor at **`/admin/`** (Sveltia CMS, self-hosted in
`apps/client/public/admin/`). It edits the same markdown the site is built from
(`apps/client/src/content/`) and every save is a commit on `main`, which rebuilds
and redeploys the site in about two minutes. No database, no extra account.

- Preview today: https://49shamans7.github.io/manastirea-saharna-v2/admin/
- After the Cloudflare switch: https://manastirea-saharna.md/admin/

## What can be edited

| Section | What | Create / delete |
|---|---|---|
| **Cronica** | news posts, ro + optional en/ru, title, date, author, summary, main photo, gallery, YouTube codes, draft switch | yes |
| **Pagini** | the long texts (Istoria, Viața Cuviosului Macarie, Acatistul, Slujba, Cazare…), title, introduction, text | no — their place on the site is fixed in code |
| **Program și date de contact** | the service schedule, phones, emails, address, bank details, PayPal | no: fixed forms |

Uploaded photos are converted to WebP and capped at 2000 px in the browser before
they are committed (`apps/client/public/uploads/`).

## Giving someone access (Gelu, once per editor)

Until the GitHub sign-in relay is set up, editors sign in with a token:

1. The editor makes a GitHub account. Gelu adds it under
   *Settings → Collaborators* on `49shamans7/manastirea-saharna-v2` (role: Write).
2. The editor creates a **fine-grained token**: GitHub → Settings → Developer
   settings → Fine-grained tokens → *Generate*. Repository access: **only
   `49shamans7/manastirea-saharna-v2`**. Permissions: **Contents: Read and write**.
   Expiry: 1 year.
3. At `/admin/` → **Sign In Using Access Token** → paste it. The browser
   remembers it.

### "Sign in with GitHub" instead of tokens

`workers/sveltia-cms-auth/` is the OAuth relay, deployed with the same Cloudflare
login. `bun run cloudflare:setup` offers it: it deploys the worker, sets its two
secrets and writes `base_url` into `apps/client/public/admin/config.yml`.

What only the owner can do, because GitHub has no API for it:

1. Register the OAuth app. The script prints a link with every field filled in;
   press *Register application*, then *Generate a new client secret*.
2. Paste the client id and the secret at the script's two prompts.
3. Commit `config.yml`.

Editors still need Write access on the repository. The button asks for
`public_repo` only. Tokens keep working. The relay answers only the hosts in
`ALLOWED_DOMAINS` (`workers/sveltia-cms-auth/wrangler.jsonc`), so sign in from the
domain or from Pages, not from the workers.dev preview.

## Trying it locally (no token needed)

`bun run dev:client`, open http://localhost:4321/manastirea-saharna-v2/admin/index.html
in Chrome → **Work with Local Repository** → choose the repo folder. Saves go to
your working tree, not to GitHub.

## Pentru părinți — cum publicați o știre

1. Deschideți **/admin/** și intrați (prima dată: lipiți codul de acces).
2. **Cronica → Nou**.
3. Completați **Titlu**, **Data**, **Autor**, un **Rezumat** de o frază.
4. **Fotografia principală**: alegeți o poză din telefon/calculator.
   **Galerie**: adăugați câte poze doriți.
5. Scrieți textul. Pentru video YouTube, copiați doar codul de 11 caractere
   din adresă (după `v=`).
6. **Salvați**. În circa două minute știrea apare pe site.

Ciornă = bifați *Ciornă* și salvați; știrea nu apare până nu debifați.
Traducerea în engleză/rusă este opțională — dacă lipsește, site-ul arată textul
românesc.

## Notes for the developer

- Config: `apps/client/public/admin/config.yml`. Sveltia 0.233.1 is vendored as
  `admin/sveltia-cms.js` (MIT, `admin/SVELTIA-LICENSE.txt`); to upgrade, replace
  the file from `npm pack @sveltia/cms`.
- `/admin/*` has its own CSP in `public/_headers` (Cloudflare only); it is kept
  out of Pagefind and `robots.txt`.
- `public_folder` stays `/uploads`, without the base path: `data/posts.ts` and
  `rebase()` add it, so uploads resolve on Pages and on the domain alike.
- Posts saved from the admin carry `galleryImages` as `{ src }` only;
  `content.config.ts` derives the thumbnail. Old posts keep their 800w/360w pairs.
- Post bodies render as markdown and pass through `rebase()` (data/pages.ts), so
  `/uploads/…` and other site paths in the text work under any base path.
