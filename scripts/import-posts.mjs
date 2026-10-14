// Imports the monastery's chronicle out of the WordPress archive into the
// content collection. 306 posts, 2013 → 2026, written by Arhimandritul
// Iuvenalie and Pr. Mihail Bortă.
//
// Source  ~/Projects/msaharna-archive/text/content.json   (read-only, 2.6 GB
//         sibling archive, deliberately outside this repo)
//         ~/Projects/msaharna-archive/raw/html/            (for the exact
//         publication instant — the scraped time is a 12-hour clock)
//         ~/Projects/msaharna-archive/media/videos.json    (27 YouTube embeds)
// Output  apps/client/src/content/posts/<locale>/<slug>.md
//         scripts/post-images.json  (what build-post-media.mjs derives from)
//
//   bun scripts/import-posts.mjs && bun scripts/build-post-media.mjs
//
// Re-running overwrites every post file: the posts are generated, not edited.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARCHIVE = path.resolve(ROOT, "../msaharna-archive");
const CONTENT = path.join(ROOT, "apps/client/src/content/posts");

// Where the WordPress sharing furniture starts. Everything from the first of
// these to the end of the post is chrome, not text.
const BOILERPLATE = [
  "Partajează asta",
  "Tweet",
  "Partajează prin WhatsApp",
  "Partajează pe Telegram",
  "Conținutul acestui website",
  "Calendar Creștin Ortodox",
  "Galeria Video",
  "Apreciază",
  "Îmi place",
  "Publicat de",
];

/**
 * Entries that are not Romanian originals. The one Russian post is the
 * monastery's own Russian version of a Romanian notice published the same
 * day, so it is filed as that entry's translation: /ru/posts/<slug> reads it,
 * and the Romanian chronicle no longer carries a Russian-language row.
 */
const TRANSLATIONS = {
  "https://manastirea-saharna.md/stiri-si-evenimente/%d0%be%d0%b1%d1%8a%d1%8f%d1%81%d0%bd%d0%b8%d0%bc%d0%be%d0%b5-%d0%bd%d0%b5%d0%be%d0%b1%d1%8a%d1%8f%d1%81%d0%bd%d0%b8%d0%bc%d0%be%d0%b5-%d0%b8%d0%bb%d0%b8-%d0%bd%d0%b5%d1%81%d1%83%d1%89/":
    { locale: "ru", slug: "inexplicabilul-explicabil-groapa-de-gunoi-inexistenta-si-locul-necunoscut" },
};

// Turkish cedillas → the comma-below forms Romanian actually uses.
const CEDILLA = { ş: "ș", Ş: "Ș", ţ: "ț", Ţ: "Ț" };

/** Unicode hygiene: composed forms, comma-below, no invisible characters. */
function normalize(text) {
  return text
    .normalize("NFC")
    .replace(/[ŞşŢţ]/g, (c) => CEDILLA[c] ?? c)
    .replace(/[​‌‍⁠﻿­]/g, "")
    .replace(/ /g, " ");
}

function stripChrome(text) {
  const cuts = BOILERPLATE.map((marker) => text.indexOf(marker)).filter((index) => index >= 0);
  const cut = cuts.length ? Math.min(...cuts) : text.length;

  return text.slice(0, cut);
}

/**
 * Typing habits of the old editor, not wording: a space before a closing
 * mark ("Saharna , cu" → "Saharna, cu"; "Aliluia !" → "Aliluia!") and a comma
 * glued to the next word ("Saharna ,plină" → "Saharna, plină"). ",," is the
 * site's opening quote and is left alone.
 */
function tidyPunctuation(line) {
  return line.replace(/(\S) +(?!,,)([,;:!?.]+)(?=\s|$)/g, "$1$2").replace(/(\p{L}) +,(?!,)(\p{L})/gu, "$1, $2");
}

/** The scrape keeps WordPress's ragged whitespace; paragraphs are what matter. */
function toParagraphs(text) {
  return text
    .split(/\n+/)
    .map((line) => tidyPunctuation(line.replace(/\s+/g, " ").trim()))
    .filter((line) => line.length > 1);
}

/**
 * The scraper put a space wherever an inline tag closed, so "Mar<span>ț</span>i"
 * came out as "Mar ț i". Re-read the raw article with inline tags removed and
 * rejoin a run of 2–4 fragments when the joined word is what the page showed
 * and at least one fragment is not a word anywhere in the chronicle.
 */
const INLINE = /<\/?(?:span|strong|b|em|i|u|a|font|sup|sub|mark|small|wbr)\b[^>]*>/gi;

function pageWords(html) {
  const article = html.match(/<div class="post">\s*<article>([\s\S]*?)<\/article>/i)?.[1] ?? html;
  const text = normalize(
    article
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(INLINE, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&#8217;|&rsquo;/g, "’")
      .replace(/&amp;/g, "&"),
  );

  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function rejoinSplitWords(paragraph, onPage, corpus) {
  const tokens = paragraph.split(" ");
  const out = [];

  for (let i = 0; i < tokens.length; ) {
    let joined = false;

    for (const n of [4, 3, 2]) {
      const run = tokens.slice(i, i + n);
      if (run.length < n) continue;
      // the first fragment may carry what precedes the word ("Panteleimon-"),
      // the last what follows it ("ii," / "ntunericului.Tot")
      const head = run[0].match(/^.*[^\p{L}\p{N}]/u)?.[0] ?? "";
      run[0] = run[0].slice(head.length);
      const tail = run[n - 1].match(/[^\p{L}\p{N}-].*$/u)?.[0] ?? ""; // never split "s-a"
      run[n - 1] = run[n - 1].slice(0, run[n - 1].length - tail.length);
      if (n === 1 || run.some((t) => t === "")) continue;
      if (!run.every((t) => /^[\p{L}\p{N}]+$/u.test(t))) continue;

      const word = run.join("");
      // "a", "e", "o", "i" are words; any other lone letter is a fragment
      const stray = (t) => !corpus.has(t.toLowerCase()) || (t.length === 1 && !/^[aeoi]$/i.test(t));
      const strays = run.some(stray);
      // letter-spaced display text ("Î N V I T A Ț I E") is typography, not damage
      const single = (t) => t !== undefined && /^\p{L}$/u.test(t);
      const spaced = run.every(single) && (single(out[out.length - 1]) || single(tokens[i + n]));
      if (spaced) continue;

      if (onPage.has(word.toLowerCase()) && strays) {
        out.push(head + word + tail);
        i += n;
        joined = true;
        break;
      }
    }

    if (!joined) {
      out.push(tokens[i]);
      i += 1;
    }
  }

  return out.join(" ");
}

function slugOf(post) {
  // "stiri-si-evenimente_bucuria-adormirii" → "bucuria-adormirii"
  const raw = post.slug.includes("_") ? post.slug.slice(post.slug.indexOf("_") + 1) : post.slug;

  return raw
    .replace(/_c2_ad/g, "") // a soft hyphen percent-encoded into the WordPress slug
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * The old site printed a 12-hour clock with no AM/PM ("7:11, luni, …" for
 * 19:11), so the scraped time cannot be trusted; the page's
 * article:published_time is the real instant (UTC). The site shows dates in
 * Europe/Chisinau, which is how the date printed on the old page was made.
 */
function publishedAt(html, fallback) {
  const meta = html.match(/article:published_time" content="([^"]+)"/)?.[1];
  const date = new Date(meta ?? fallback?.replace(/T(\d):/, "T0$1:") ?? "");

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Abbreviations that end in a full stop without ending the sentence.
const ABBREVIATIONS = new Set(
  "sf sfânt sfânta cuv pr ps îps ips prea arhim arhiep ep mitr ierom ierod ierom monah dr nr str or s r-nul jud prof lect conf a.c ș.a etc d dl dna p î.p.s p.s".split(
    " ",
  ),
);

/**
 * An excerpt is the opening of the entry, never a sentence cut in half:
 * as many whole sentences as fit in 300 characters, or — when the first
 * sentence alone is longer — the words that fit, closed with an ellipsis.
 */
function excerptOf(paragraphs, limit = 300) {
  const text = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;

  let end = -1;
  const boundary = /[.!?…]+["”»’)]*(?=\s+["„«(]?[\p{Lu}\d])/gu;

  for (const match of text.matchAll(boundary)) {
    const stop = match.index + match[0].length;
    if (stop > limit) break;

    const before =
      text
        .slice(0, match.index)
        .match(/([\p{L}.-]+)$/u)?.[1]
        ?.toLowerCase() ?? "";
    if (match[0].startsWith(".") && (ABBREVIATIONS.has(before) || /^\p{L}$/u.test(before))) continue;
    end = stop;
  }

  if (end >= 80) return text.slice(0, end);

  const cut = text.slice(0, limit - 1);
  const words = cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:–—-]+$/, "");

  return `${words}…`;
}

function yaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const content = JSON.parse(await readFile(path.join(ARCHIVE, "text/content.json"), "utf8"));
const fetchLog = JSON.parse(await readFile(path.join(ARCHIVE, "raw/fetch_log.json"), "utf8"));
const embeds = JSON.parse(await readFile(path.join(ARCHIVE, "media/videos.json"), "utf8"));
const posts = content.filter((entry) => entry.kind === "post");

/** page url → YouTube ids, in page order. */
const videosOf = new Map();
for (const { embed, page } of embeds) {
  const id = embed?.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/)?.[1];
  if (!id) continue;
  const list = videosOf.get(page) ?? [];
  if (!list.includes(id)) list.push(id);
  videosOf.set(page, list);
}

async function rawHtml(url) {
  const file = fetchLog[url]?.file;

  return file ? readFile(file, "utf8").catch(() => "") : "";
}

// Every word the chronicle's pages actually show (inline tags removed), for
// telling a real word from a fragment. Built from the raw pages, not the
// scraped text, which carries the very fragments we are looking for.
const pages = new Map();
for (const post of posts) pages.set(post.url, await rawHtml(post.url));
const wordsOf = new Map([...pages].map(([url, html]) => [url, pageWords(html)]));
const corpus = new Set([...wordsOf.values()].flatMap((words) => [...words]));

const seen = new Set();
const manifest = [];
let written = 0;
let skipped = 0;
let rejoined = 0;

for (const post of posts) {
  const html = pages.get(post.url) ?? "";
  const date = publishedAt(html, post.date);
  const onPage = wordsOf.get(post.url);
  const body = toParagraphs(stripChrome(normalize(post.text ?? ""))).map((paragraph) => {
    const fixed = rejoinSplitWords(paragraph, onPage, corpus);
    if (fixed !== paragraph) rejoined += 1;
    return fixed;
  });
  const videos = videosOf.get(post.url) ?? [];

  // A post with no prose is not empty — most are gallery posts, where the
  // title, the date and the photographs are the whole entry, and a few are
  // a single video. Only a post with none of these is nothing.
  if (!date || (body.length === 0 && post.images.length === 0 && videos.length === 0)) {
    skipped += 1;
    continue;
  }

  const translation = TRANSLATIONS[post.url];
  const locale = translation?.locale ?? "ro";
  let slug = translation?.slug ?? slugOf(post);
  while (seen.has(`${locale}/${slug}`)) slug = `${slug}-2`;
  seen.add(`${locale}/${slug}`);

  const title = tidyPunctuation(
    normalize(post.title ?? "")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const front = [
    "---",
    `title: ${yaml(title)}`,
    `excerpt: ${yaml(excerptOf(body))}`,
    `publishedAt: ${date}`,
    `author: ${yaml(normalize(post.author ?? ""))}`,
    "draft: false",
    "zone: green",
    `gallery: ${body.length === 0 && post.images.length > 0 ? "true" : "false"}`,
    `sourceUrl: ${yaml(post.url)}`,
    `archiveImages: ${post.images.length}`,
    ...(videos.length ? ["videos:", ...videos.map((id) => `  - ${yaml(id)}`)] : []),
    // The media pass replaces this with local derivatives.
    "image: null",
    "---",
    "",
    body.join("\n\n"),
    "",
  ].join("\n");

  await mkdir(path.join(CONTENT, locale), { recursive: true });
  await writeFile(path.join(CONTENT, locale, `${slug}.md`), front);
  manifest.push({ slug, locale, images: post.images, url: post.url });
  written += 1;
}

await writeFile(path.join(ROOT, "scripts/post-images.json"), `${JSON.stringify(manifest, null, 1)}\n`);

const total = manifest.reduce((n, p) => n + p.images.length, 0);
console.log(`${written} posts written, ${skipped} skipped (no date, or nothing to show)`);
console.log(`${rejoined} paragraphs with tag-split words rejoined`);
console.log(`${[...videosOf.values()].flat().length} video ids, ${total} image references → scripts/post-images.json`);
