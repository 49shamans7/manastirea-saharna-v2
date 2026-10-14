import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

import { locales } from "@i18n";

// Backend, MVP. Posts are files in this repo — no database, no object store,
// no third-party account. A chamber in Zone II per ARCHITECTURE.md.
// Path shape: src/content/posts/<locale>/<slug>.md  →  id "<locale>/<slug>"
const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string().default(""),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
    /** Pr. Mihail Bortă or Arhimandritul Iuvenalie, from the old site. */
    author: z.string().default(""),
    /** Where this entry lived on manastirea-saharna.md. */
    sourceUrl: z.string().optional(),
    /** A gallery post: title, date and photographs, no prose. */
    gallery: z.boolean().default(false),
    /** How many photographs the archive holds for this entry. */
    archiveImages: z.number().default(0),
    // Which stratum the chamber wears. Posts are Zone II unless told otherwise.
    zone: z.enum(["rock", "green", "gold", "river"]).default("green"),
    image: z
      .object({
        /** 1400w. */
        src: z.string(),
        /** 800w, for phones and the post column. */
        medium: z.string().optional(),
        /** 480w, for lists. */
        thumb: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        alt: z.string().default(""),
      })
      .nullable()
      .default(null),
    /** Further photographs (800w + 360w), capped per post by build-post-media.mjs. */
    galleryImages: z
      .array(
        z.union([
          z.string().transform((src) => ({ src, thumb: src, width: 0, height: 0 })),
          // entries saved from the admin carry only `src`; the list thumb
          // falls back to the photograph itself
          z
            .object({
              src: z.string(),
              thumb: z.string().optional(),
              width: z.number().default(0),
              height: z.number().default(0),
            })
            .transform((plate) => ({ ...plate, thumb: plate.thumb ?? plate.src })),
        ]),
      )
      .default([]),
    /** YouTube ids embedded in the entry on the old site. */
    videos: z.array(z.string().regex(/^[\w-]{11}$/)).default([]),
  }),
});

/**
 * Chamber prose. The long-form pages — istoria, macarie, obștea, cazare —
 * are documents, not UI strings, so they live here rather than in the i18n
 * dictionary. A page missing in en/ru falls back to ro, which is the language
 * the monastery actually keeps its texts in.
 */
const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string().default(""),
    lead: z.string().default(""),
    zone: z.enum(["rock", "green", "gold", "river"]),
    /** A chamber (prose) or a table (practical info). ARCHITECTURE.md B / C. */
    template: z.enum(["chamber", "table"]).default("chamber"),
    order: z.number().default(0),
    sourceUrl: z.string().optional(),
  }),
});

export const collections = { posts, pages };
export const contentLocales = Object.keys(locales);
