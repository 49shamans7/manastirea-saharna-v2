# Admin — publishing without the developer

The site has an editor at **`/admin/`** (Sveltia CMS, self-hosted in
`apps/client/public/admin/`). It edits the same markdown the site is built from
(`apps/client/src/content/`) and every save is a commit on `dev`, which rebuilds
and redeploys the site in about two minutes. No database, no extra account.

- Preview today: https://49shamans7.github.io/manastirea-saharna-v2/admin/
- After the Cloudflare switch: https://manastirea-saharna.md/admin/

## What can be edited

| Section | What | Create / delete |
|---|---|---|
| **Cronica** | news posts, ro + optional en/ru, title, date, author, summary, main photo, gallery, YouTube codes, draft switch | yes |
| **Pagini** | the long texts (Istoria, Viața Cuviosului Macarie, Acatistul, Slujba, Cazare…), title, introduction, text | no — their place on the site is fixed in code |

Uploaded photos are converted to WebP and capped at 2000 px in the browser before
they are committed (`apps/client/public/uploads/`).

## Giving someone access (Gelu, once per editor)

Until the GitHub sign-in relay exists, editors sign in with a token:

1. The editor makes a GitHub account. Gelu adds it under
   *Settings → Collaborators* on `49shamans7/manastirea-saharna-v2` (role: Write).
2. The editor creates a **fine-grained token**: GitHub → Settings → Developer
   settings → Fine-grained tokens → *Generate*. Repository access: **only
   `49shamans7/manastirea-saharna-v2`**. Permissions: **Contents: Read and write**.
   Expiry: 1 year.
3. At `/admin/` → **Sign In Using Access Token** → paste it. The browser
   remembers it.

Later, to replace tokens with a normal "Sign in with GitHub" button: deploy
[sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) as a Cloudflare
Worker during the switch (`docs/CLOUDFLARE-HANDOVER.md`), register a GitHub OAuth
app pointing at it, and add `base_url: https://<worker-url>` under `backend:` in
`apps/client/public/admin/config.yml`.

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
- Posts saved from the admin carry `galleryImages` as `{ src }` only;
  `content.config.ts` derives the thumbnail. Old posts keep their 800w/360w pairs.
- Post bodies render as markdown and pass through `rebase()` (data/pages.ts), so
  `/uploads/…` and other site paths in the text work under any base path.
