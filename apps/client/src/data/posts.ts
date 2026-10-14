import { getCollection, render } from "astro:content";
import type { CollectionEntry } from "astro:content";

import { defaultLocale, locales, type Locale } from "@i18n";
import { withBasePath } from "@utils/paths";

export const POSTS_PER_PAGE = 12;

export type PostItem = {
  id: string;
  slug: string;
  title: string;
  /** Formatted for display in the post's own locale. */
  date: string;
  /** ISO, for <time datetime> and sorting. */
  isoDate: string;
  /** The year as the monastery dated it (Europe/Chisinau), for the year index. */
  year: string;
  excerpt: string;
  body: string[];
  zone: "rock" | "green" | "gold" | "river";
  author: string;
  /** A gallery post: the photographs are the entry. */
  gallery: boolean;
  archiveImages: number;
  /** True when this is the Romanian original shown to an en/ru reader. */
  isFallback: boolean;
  image: {
    alt: string;
    url: string;
    /** 480w derivative for lists; falls back to the full image. */
    thumb: string;
    /** `srcset` across the derivatives that exist (480w / 800w / 1400w). */
    srcset: string;
    /** 480w / 800w only — what a phone or a list row should ever fetch. */
    smallSrcset: string;
    width?: number;
    height?: number;
  } | null;
  galleryImages: { src: string; thumb: string; width: number; height: number }[];
  /** YouTube ids from the old site's embeds. */
  videos: string[];
  entry: CollectionEntry<"posts">;
};

function localeOf(entry: CollectionEntry<"posts">): Locale {
  const [segment] = entry.id.split("/");

  return segment && segment in locales ? (segment as Locale) : defaultLocale;
}

function slugOf(entry: CollectionEntry<"posts">): string {
  const parts = entry.id.split("/");

  return parts[parts.length - 1] ?? entry.id;
}

/**
 * The chronicle is dated where it was written. Stored instants are UTC; the
 * day printed must not depend on the time zone of the machine that builds.
 */
const TIME_ZONE = "Europe/Chisinau";

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locales[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(value);
}

function yearOf(value: Date) {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: TIME_ZONE }).format(value);
}

/**
 * The markdown body split into paragraphs. Chambers render prose, not a blob —
 * `render()` is available on `entry` for posts that need real markdown.
 */
function toParagraphs(raw: string) {
  return raw
    .replace(/^---[\s\S]*?---/, "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * The importer writes excerpts that end on a sentence or on "…". An excerpt
 * written by hand may not: close it with an ellipsis — unless it is the whole
 * entry, which needs none. A word cut in half (the old 300-character slice)
 * loses the fragment first.
 */
function closeExcerpt(raw: string, body: string[]) {
  const text = raw.trim();
  if (!text || /[.!?…»”"’)]$/.test(text)) return text;
  if (body.join(" ").replace(/\s+/g, " ").trim() === text) return text;
  const lastSpace = text.lastIndexOf(" ");
  const nextIsWord = (body.join(" ").replace(/\s+/g, " ").charAt(text.length) || " ") !== " ";
  const cut = nextIsWord && lastSpace > text.length * 0.6 ? text.slice(0, lastSpace) : text;
  return `${cut.replace(/[\s,;:–—-]+$/, "")}…`;
}

function toPostItem(entry: CollectionEntry<"posts">, viewing: Locale = defaultLocale): PostItem {
  const locale = localeOf(entry);
  const { image } = entry.data;
  const body = toParagraphs(entry.body ?? "");
  const small = image
    ? [image.thumb && `${withBasePath(image.thumb)} 480w`, image.medium && `${withBasePath(image.medium)} 800w`].filter(
        Boolean,
      )
    : [];
  const srcset = image ? [...small, `${withBasePath(image.src)} ${image.width ?? 1400}w`].join(", ") : "";

  return {
    id: entry.id,
    slug: slugOf(entry),
    // the old site closed every headline with a full stop; a heading takes none
    title: entry.data.title.replace(/(?<!\.)\.\s*$/, ""),
    // dates in the reader's language, even when the text falls back to Romanian
    date: formatDate(entry.data.publishedAt, viewing),
    isoDate: entry.data.publishedAt.toISOString(),
    year: yearOf(entry.data.publishedAt),
    excerpt: closeExcerpt(entry.data.excerpt, body),
    body,
    zone: entry.data.zone,
    author: entry.data.author,
    gallery: entry.data.gallery,
    archiveImages: entry.data.archiveImages,
    isFallback: locale !== viewing,
    image: image
      ? {
          alt: image.alt,
          url: withBasePath(image.src),
          thumb: withBasePath(image.thumb ?? image.src),
          srcset,
          smallSrcset: small.length ? small.join(", ") : withBasePath(image.src),
          width: image.width,
          height: image.height,
        }
      : null,
    galleryImages: entry.data.galleryImages.map((plate: PostItem["galleryImages"][number]) => ({
      ...plate,
      src: withBasePath(plate.src),
      thumb: withBasePath(plate.thumb),
    })),
    videos: entry.data.videos,
    entry,
  };
}

/**
 * The chronicle is written in Romanian — 305 entries, 2013 to 2026. Nothing
 * was ever translated, so en and ru read the Romanian originals rather than
 * an empty page. A translated entry, when one exists, wins over its original.
 */
// One list per locale for the whole static build: every post page asks for it
// twice (the post, its neighbours), and rebuilding 306 items per page for ~900
// pages ran the build out of memory. Dev stays uncached so edits show at once.
const publishedCache = new Map<Locale, Promise<PostItem[]>>();

export function getPublishedPosts(locale: Locale): Promise<PostItem[]> {
  if (!import.meta.env.PROD) return loadPublishedPosts(locale);
  let cached = publishedCache.get(locale);
  if (!cached) {
    cached = loadPublishedPosts(locale);
    publishedCache.set(locale, cached);
  }
  return cached;
}

async function loadPublishedPosts(locale: Locale): Promise<PostItem[]> {
  const live = (entry: CollectionEntry<"posts">) => !(entry.data.draft && import.meta.env.PROD);
  const all = await getCollection("posts", live);

  const inLocale = all.filter((entry: CollectionEntry<"posts">) => localeOf(entry) === locale);
  const translated = new Set(inLocale.map(slugOf));
  const originals =
    locale === defaultLocale
      ? []
      : all.filter(
          (entry: CollectionEntry<"posts">) => localeOf(entry) === defaultLocale && !translated.has(slugOf(entry)),
        );

  const posts: PostItem[] = [...inLocale, ...originals].map((entry: CollectionEntry<"posts">) =>
    toPostItem(entry, locale),
  );

  // Newest first, the way a cronică reads.
  posts.sort((a: PostItem, b: PostItem) => b.isoDate.localeCompare(a.isoDate));

  return posts;
}

export async function getRecentPosts(locale: Locale, limit = 3) {
  const posts = await getPublishedPosts(locale);

  return posts.slice(0, limit);
}

export async function getPostBySlug(slug: string | undefined, locale: Locale) {
  if (!slug) {
    return undefined;
  }

  // getPublishedPosts already folds the Romanian originals in for en and ru.
  const posts = await getPublishedPosts(locale);

  return posts.find((post: PostItem) => post.slug === slug);
}

/** Every slug in every locale — the routes a static build must emit. */
export async function getAllPostSlugs() {
  const entries = await getCollection("posts");
  const slugs = new Set(entries.map((entry: CollectionEntry<"posts">) => slugOf(entry)));

  return [...slugs];
}

/** Rendered markdown for a chamber that wants headings, lists and links. */
export async function renderPost(post: PostItem) {
  return render(post.entry);
}

/**
 * The chronicle runs 2013 → 2026. Twenty-six pages of "next" is not a way
 * to find the Pascha of a particular year, so the years are their own index.
 */
export function getPostYears(posts: PostItem[]) {
  const counts = new Map<string, number>();

  for (const { year } of posts) {
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year.localeCompare(a.year));
}

export function getPostsOfYear(posts: PostItem[], year: string) {
  return posts.filter((post) => post.year === year);
}

/** The entries either side of this one, for moving along the chronicle. */
export function getPostNeighbours(posts: PostItem[], slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);

  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export function getPaginatedPosts(posts: PostItem[], page: number) {
  const start = (page - 1) * POSTS_PER_PAGE;

  return posts.slice(start, start + POSTS_PER_PAGE);
}

export function getTotalPostPages(totalPosts: number) {
  return Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
}
