/**
 * Galeria Video, as the old site listed it, newest first: 13 entries.
 * `video` is empty where nothing can play any more: the 2014 documentary was
 * Flash, and the 2013 TRM broadcast is gone from YouTube.
 * Posters are the videos' own thumbnails, kept in public/video/<id>.jpg so the
 * page makes no request to YouTube until someone presses play.
 */
export const galleryVideos: { slug: string; video?: string }[] = [
  { slug: "pregatiri-de-hramul-manastirii", video: "IZBmK07kRbA" },
  { slug: "manastirea-saharna-casa-dumnezeiestii-treimi", video: "yMJDLAt5ZzU" },
  { slug: "bucura-te-sfanta-cruce", video: "dEAZdGKKIwI" },
  { slug: "comorile-tarii-manastirea-saharna", video: "vayzuRA3PPo" },
  { slug: "festivalul-cantecului-pascal-ajuns-la-a-iv-a-editie", video: "vT5a5hFIRqw" },
  { slug: "manastirea-saharna-gradina-maicii-domnului-documentar" },
  {
    slug: "icoana-maicii-domnului-tricherousa-cea-cu-trei-maini-adusa-spre-inchinare-la-manastirea-saharna",
    video: "hYKwLEvFokc",
  },
  {
    slug: "in-perioada-1-8-iulie-a-c-in-manastirea-noastra-va-fi-adusa-spre-venerare-din-sfantul-munte-athos-ic",
    video: "tsenvf75ums",
  },
  { slug: "traditii-si-obiceiuri-de-boboteaza", video: "uz-LLrHz8x4" },
  { slug: "boboteaza-la-manastirea-saharna", video: "1i_wplEUjD0" },
  { slug: "descopera-moldova-manastirea-saharna", video: "7GpYni8ptq0" },
  { slug: "complexul-monastic-saharna", video: "4c1NgmeFJO0" },
  { slug: "cuvintele-credintei-la-manastirea-saharna" },
];
