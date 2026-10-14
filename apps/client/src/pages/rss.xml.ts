// The chronicle as a feed — the newest fifty entries, Romanian originals.
// Every link is absolute and carries the base path, so the feed is right on
// GitHub Pages (/manastirea-saharna/) and on the monastery's own domain (/).
import rss from "@astrojs/rss";
import type { APIContext } from "astro";

import { getPublishedPosts } from "@data/posts";
import { useTranslations } from "@i18n/utils";
import { withBasePath } from "@utils/paths";

const FEED_SIZE = 50;

export async function GET(context: APIContext): Promise<Response> {
  const site = context.site ?? new URL("https://manastirea-saharna.md");
  const t = useTranslations("ro");
  const posts = (await getPublishedPosts("ro")).slice(0, FEED_SIZE);
  const absolute = (path: string): string => new URL(withBasePath(path), site).href;

  return rss({
    title: t("main.title"),
    description: t("main.description"),
    site: absolute("/"),
    trailingSlash: true,
    customData: "<language>ro</language>",
    items: posts.map((post) => ({
      title: post.title,
      link: absolute(`/posts/${post.slug}/`),
      pubDate: new Date(post.isoDate),
      description: post.excerpt,
      ...(post.image && {
        enclosure: {
          url: new URL(post.image.url, site).href,
          length: 0,
          type: "image/webp",
        },
      }),
    })),
  });
}
