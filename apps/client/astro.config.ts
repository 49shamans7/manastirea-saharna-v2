import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import i18n from "astro-i18n-aut/integration";

import { defaultLocale, locales } from "./src/i18n";

// hreflang values: the short codes the pages already declare in <html lang>.
const hreflang = Object.fromEntries(Object.keys(locales).map((code) => [code, code]));

export default defineConfig({
  prefetch: true,
  output: "static",
  // Deployment target. When the real domain (manastirea-saharna.md) goes live,
  // set SITE to it and BASE to "/" — nothing else needs to change.
  site: process.env.SITE_URL || "https://49shamans7.github.io",
  base: process.env.BASE_PATH || "/manastirea-saharna-v2",
  // astro-i18n-aut forces these two anyway, but it does so after Astro has
  // already normalised image.endpoint.route — so in dev <Image> pointed at
  // `/_image?…` (404 under trailing-slash-always). Declaring them here lets
  // Astro emit `/_image/?…`. Static build output is unchanged.
  trailingSlash: "always",
  build: { format: "directory" },
  // CI / local verification can build somewhere other than ./dist.
  ...(process.env.OUT_DIR ? { outDir: process.env.OUT_DIR } : {}),

  integrations: [
    i18n({
      locales,
      defaultLocale,
      // endpoints (rss.xml.ts) are not translated pages: keep them out of the
      // per-locale copies (and out of the "non-astro file" warning)
      exclude: ["pages/api/**/*", "pages/**/*.ts"],
    }),
    sitemap({
      i18n: { defaultLocale, locales: hreflang },
      // not landing pages: astro-i18n-aut's /ro/* redirect stubs, the 404s and
      // the search page (noindex)
      filter: (page) => !/\/ro\/|\/(?:(?:en|ru)\/)?(?:404|cautare)\/?$/.test(page),
      // x-default → the Romanian page, next to ro/en/ru
      serialize(item) {
        const ro = item.links?.find((link) => link.lang === defaultLocale);

        if (ro) {
          item.links = [...(item.links ?? []), { lang: "x-default", url: ro.url }];
        }

        return item;
      },
    }),
  ],

  vite: {
    // public/ holds ~9,000 derived photos (WebP + AVIF). Watching them all ran
    // the dev server out of file handles (EMFILE) and killed it. They only
    // change when a scripts/build-*.mjs run regenerates them — restart dev then.
    server: {
      watch: {
        ignored: ["**/public/posts/**", "**/public/gallery/**", "**/public/fisiere/**", "**/public/pages/**"],
      },
    },
  },
});
