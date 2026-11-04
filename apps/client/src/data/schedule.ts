/**
 * The liturgical schedule, verbatim from the monastery's own
 * `programul-sfintelor-slujbe` page. The words live in schedule.json, which the
 * secretary edits at /admin under "Programul slujbelor". Saharna serves two
 * Liturgies on Thursday, Saturday and Sunday, in three different churches, and
 * that structure is the information.
 *
 * Times are kept in the monastery's own 05.45 notation. English and Russian are
 * optional: a blank one shows the Romanian rather than disappearing.
 */
import days from "./schedule.json";

export type Service = {
  time: string;
  name: string;
  nameEn?: string;
  nameRu?: string;
  note?: string;
  noteEn?: string;
  noteRu?: string;
};
export type ServiceDay = {
  /** i18n key under `schedule.` */
  key: string;
  /** Some days run two Liturgies; each gets its own block. */
  blocks: { titleKey?: string; services: Service[] }[];
};

const titles: Record<string, string> = {
  first: "schedule.firstLiturgy",
  second: "schedule.secondLiturgy",
};

type StoredDay = { blocks: { title?: string; services: Service[] }[] };

export const schedule: ServiceDay[] = Object.entries(days as Record<string, StoredDay>).map(([key, day]) => ({
  key,
  blocks: day.blocks.map(({ title, services }) => {
    const titleKey = title ? titles[title] : undefined;

    return titleKey ? { titleKey, services } : { services };
  }),
}));

/** A service's name in the reader's language. */
export function serviceName(service: Service, lang: string): string {
  if (lang === "en") return service.nameEn || service.name;
  if (lang === "ru") return service.nameRu || service.name;
  return service.name;
}

/** A service's note in the reader's language. */
export function serviceNote(service: Service, lang: string): string | undefined {
  if (lang === "en") return service.noteEn || service.note;
  if (lang === "ru") return service.noteRu || service.note;
  return service.note;
}
