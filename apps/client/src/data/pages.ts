import { getCollection, render } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { defaultLocale, locales, type Locale } from "@i18n";
import { getLocalizedPath } from "@i18n/utils";
import { stripBasePath, withBasePath } from "@utils/paths";

export type ChamberPage = {
  slug: string;
  entry: CollectionEntry<"pages">;
  /** The locale the page is being shown in (not necessarily the body's). */
  locale: Locale;
  /** true when we fell back to the Romanian text for this locale. */
  isFallback: boolean;
};

function localeOf(entry: CollectionEntry<"pages">): Locale {
  const [segment] = entry.id.split("/");

  return segment && segment in locales ? (segment as Locale) : defaultLocale;
}

function slugOf(entry: CollectionEntry<"pages">): string {
  const parts = entry.id.split("/");

  return parts[parts.length - 1] ?? entry.id;
}

/** A translation file with frontmatter and no body: it translates the head only. */
function isHeadOnly(entry: CollectionEntry<"pages">): boolean {
  return (entry.body ?? "").trim() === "";
}

/**
 * The page in the asked-for locale, or the Romanian original.
 * The monastery writes in Romanian; a missing translation must never 404.
 *
 * An en/ru file may carry only frontmatter (title, eyebrow, lead): then the
 * head is shown translated over the Romanian body, and the page still counts
 * as a fallback so [chamber] marks the body lang="ro".
 */
export async function getChamberPage(slug: string, locale: Locale): Promise<ChamberPage | undefined> {
  const entries = await getCollection("pages");
  const inLocale = entries.find(
    (entry: CollectionEntry<"pages">) => localeOf(entry) === locale && slugOf(entry) === slug,
  );

  if (inLocale && !isHeadOnly(inLocale)) {
    return { slug, entry: inLocale, locale, isFallback: false };
  }

  const original = entries.find(
    (entry: CollectionEntry<"pages">) => localeOf(entry) === defaultLocale && slugOf(entry) === slug,
  );

  if (!original) {
    return undefined;
  }

  if (inLocale && locale !== defaultLocale) {
    const { title, eyebrow, lead } = inLocale.data;
    const head = { title, ...(eyebrow && { eyebrow }), ...(lead && { lead }) };

    return { slug, entry: { ...original, data: { ...original.data, ...head } }, locale, isFallback: true };
  }

  return { slug, entry: original, locale, isFallback: locale !== defaultLocale };
}

/** Every chamber slug the static build must emit, taken from the Romanian set. */
export async function getChamberSlugs() {
  const entries = await getCollection("pages");
  const slugs = new Set(
    entries
      .filter((entry: CollectionEntry<"pages">) => localeOf(entry) === defaultLocale)
      .map((entry: CollectionEntry<"pages">) => slugOf(entry)),
  );

  return [...slugs];
}

const isSitePath = (path: string) => path.startsWith("/") && !path.startsWith("//");
const hasBase = (path: string) => stripBasePath(path) !== path;

/**
 * Markdown is written with canonical site paths — /galerie/#cave, /pages/x.webp —
 * because the base path is a deployment setting and the locale prefix depends
 * on who is reading. Links get both; images and srcsets get the base only.
 */
export function rebase(html: string, locale: Locale): string {
  return html
    .replace(/(\shref)="([^"]*)"/g, (match, attr: string, path: string) =>
      isSitePath(path) && !hasBase(path)
        ? // a file (/fisiere/x.pdf) is the same in every language: base path only
          `${attr}="${/\.[a-z0-9]{2,5}$/i.test(path.split("#")[0] ?? "") ? withBasePath(path) : getLocalizedPath(path, locale)}"`
        : match,
    )
    .replace(/(\ssrc)="([^"]*)"/g, (match, attr: string, path: string) =>
      isSitePath(path) && !hasBase(path) ? `${attr}="${withBasePath(path)}"` : match,
    )
    .replace(/(\ssrcset)="([^"]*)"/g, (_match, attr: string, set: string) => {
      const candidates = set.split(",").map((candidate) => {
        const [path = "", ...descriptor] = candidate.trim().split(/\s+/);
        const url = isSitePath(path) && !hasBase(path) ? withBasePath(path) : path;

        return [url, ...descriptor].join(" ");
      });

      return `${attr}="${candidates.join(", ")}"`;
    });
}

export async function renderChamber(page: ChamberPage) {
  const { rendered } = page.entry;

  if (!rendered?.html) {
    return render(page.entry);
  }

  return render({ ...page.entry, rendered: { ...rendered, html: rebase(rendered.html, page.locale) } });
}
