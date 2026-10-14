/**
 * The liturgical schedule, verbatim from the monastery's own
 * `programul-sfintelor-slujbe` page. Not invented, not rounded, not tidied:
 * Saharna serves two Liturgies on Thursday, Saturday and Sunday, in three
 * different churches, and that structure is the information.
 *
 * Times are kept in the monastery's own 05.45 notation.
 */
export type Service = { time: string; name: string; note?: string };
export type ServiceDay = {
  /** i18n key under `schedule.` */
  key: string;
  /** Some days run two Liturgies; each gets its own block. */
  blocks: { titleKey?: string; services: Service[] }[];
};

export const schedule: ServiceDay[] = [
  {
    key: "monWed",
    blocks: [
      {
        services: [
          { time: "05.45", name: "Rugăciunile dimineții, Miezonoptica, Ceasurile 3 și 6, Acatistul zilei" },
          { time: "06.30", name: "Sfânta Liturghie în biserica „Sf. Treime”" },
          {
            time: "08.30",
            name: "Tedeum la moaștele Sf. Cuv. Macarie",
            note: "Miercuri la icoana cu o particică de moaște a Sf. Fer. Matrona de la Moscova",
          },
          { time: "17.00", name: "Vecernia și Utrenia, ceasul 1" },
          { time: "19.20", name: "Pravila călugărească" },
        ],
      },
    ],
  },
  {
    key: "thu",
    blocks: [
      {
        titleKey: "schedule.firstLiturgy",
        services: [
          { time: "05.30", name: "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Sf. Ierarh Nicolae" },
          { time: "06.30", name: "Sfânta Liturghie în biserica din trapeză „Sf. Ierarh Nicolae”" },
        ],
      },
      {
        titleKey: "schedule.secondLiturgy",
        services: [
          { time: "05.45", name: "Rugăciunile dimineții, Miezonoptica, Ceasurile 3 și 6, Acatistul zilei" },
          { time: "07.00", name: "Sfânta Liturghie în biserica „Sf. Treime”" },
          { time: "08.45", name: "Tedeum la moaștele Sf. Cuv. Macarie" },
          { time: "17.00", name: "Vecernia și Utrenia, ceasul 1" },
          { time: "19.20", name: "Pravila călugărească" },
        ],
      },
    ],
  },
  {
    key: "fri",
    blocks: [
      {
        services: [
          { time: "06.45", name: "Rugăciunile dimineții, Miezonoptica, Ceasurile 3 și 6, Acatistul zilei" },
          { time: "07.45", name: "Sfânta Liturghie în biserica „Sf. Treime”" },
          { time: "08.30", name: "Tedeum la moaștele Sf. Cuv. Macarie" },
          { time: "17.00", name: "Vecernia și Utrenia, ceasul 1" },
        ],
      },
    ],
  },
  {
    key: "sat",
    blocks: [
      {
        titleKey: "schedule.firstLiturgy",
        services: [
          { time: "05.30", name: "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului" },
          { time: "06.30", name: "Sfânta Liturghie în biserica „Nașterea Maicii Domnului”" },
        ],
      },
      {
        titleKey: "schedule.secondLiturgy",
        services: [
          { time: "08.00", name: "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului „Potir Nesecat”" },
          { time: "09.30", name: "Sfânta Liturghie în biserica „Sf. Treime”" },
          { time: "10.45", name: "Tedeum la icoana Maicii Domnului „Potir Nesecat”" },
          { time: "11.00", name: "Parastas" },
          { time: "17.00", name: "Privegherea duminicală" },
        ],
      },
    ],
  },
  {
    key: "sun",
    blocks: [
      {
        titleKey: "schedule.firstLiturgy",
        services: [
          { time: "05.30", name: "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului „Moldovenească”" },
          { time: "06.30", name: "Sfânta Liturghie în biserica „Sf. Treime”" },
        ],
      },
      {
        titleKey: "schedule.secondLiturgy",
        services: [
          { time: "08.00", name: "Rugăciunile dimineții, Ceasurile 3 și 6" },
          { time: "08.20", name: "Acatistul „Învierii Domnului”" },
          { time: "09.00", name: "A doua Liturghie în catedrala „Învierea Domnului”" },
          { time: "10.45", name: "Cuvântul de învățătură" },
          { time: "11.15", name: "Parastas" },
        ],
      },
    ],
  },
];

/**
 * The lead times shown on the homepage: the Monday–Wednesday order (label it
 * with `schedule.monWed`). For the reader's own day use `serviceDayFor`.
 */
export const homeHours: Service[] = [
  { time: "05.45", name: "Rugăciunile dimineții" },
  { time: "06.30", name: "Sfânta Liturghie" },
  { time: "08.30", name: "Tedeum la moaștele Sf. Cuv. Macarie" },
  { time: "17.00", name: "Vecernia și Utrenia" },
];

/**
 * The feasts (hramuri) the monastery keeps, as its own texts date them. Dates
 * are given old/new style where the monastery writes them so (it keeps the
 * Julian calendar). Sources in msaharna-archive: the hram invitations in the
 * chronicle (Holy Trinity, Pentecost), Viața Cuviosului Macarie (13/26 May),
 * Istoria Sfintei Mănăstiri (Nativity of the Theotokos 8/21 Sept; Pochaev
 * icon, 5 August). Not rendered yet — meant for /slujbe, under `schedule.feastsTitle`.
 */
export type Feast = { date: { ro: string; en: string; ru: string }; name: { ro: string; en: string; ru: string } };

export const feasts: Feast[] = [
  {
    date: { ro: "Duminica Cincizecimii", en: "Sunday of Pentecost", ru: "День Святой Троицы" },
    name: {
      ro: "Hramul mănăstirii: Preasfânta Treime",
      en: "Feast of the monastery: the Holy Trinity",
      ru: "Престольный праздник обители: Святая Троица",
    },
  },
  {
    date: { ro: "13/26 mai", en: "13/26 May", ru: "13/26 мая" },
    name: {
      ro: "Cuviosul Macarie de la Saharna",
      en: "Venerable Macarius of Saharna",
      ru: "Преподобный Макарий Сахарнянский",
    },
  },
  {
    date: { ro: "5 august", en: "5 August", ru: "5 августа" },
    name: {
      ro: "Icoana Maicii Domnului de la Poceaev",
      en: "The Pochaev Icon of the Mother of God",
      ru: "Почаевская икона Божией Матери",
    },
  },
  {
    date: { ro: "8/21 septembrie", en: "8/21 September", ru: "8/21 сентября" },
    name: {
      ro: "Nașterea Maicii Domnului, hramul bisericii de iarnă",
      en: "Nativity of the Theotokos, feast of the winter church",
      ru: "Рождество Пресвятой Богородицы, престольный праздник зимнего храма",
    },
  },
];

/**
 * English and Russian for the service names above, in the Church's own usage
 * (Akathist, Moleben, Midnight Office · акафист, молебен, полунощница).
 * Keyed by the Romanian text, which stays the source of truth; a name missing
 * here falls back to Romanian rather than disappearing.
 */
const serviceNames: Record<string, { en: string; ru: string }> = {
  "A doua Liturghie în catedrala „Învierea Domnului”": {
    en: "Second Divine Liturgy in the Cathedral of the Resurrection",
    ru: "Вторая Божественная литургия в соборе Воскресения Господня",
  },
  "Acatistul „Învierii Domnului”": {
    en: "Akathist to the Resurrection of the Lord",
    ru: "Акафист Воскресению Христову",
  },
  "Cuvântul de învățătură": { en: "Homily", ru: "Проповедь" },
  Parastas: { en: "Memorial service (Parastas)", ru: "Парастас" },
  "Pravila călugărească": { en: "Monastic rule of prayer", ru: "Монашеское правило" },
  "Privegherea duminicală": { en: "Sunday All-Night Vigil", ru: "Всенощное бдение" },
  "Rugăciunile dimineții": { en: "Morning prayers", ru: "Утренние молитвы" },
  "Rugăciunile dimineții, Ceasurile 3 și 6": {
    en: "Morning prayers, Third and Sixth Hours",
    ru: "Утренние молитвы, 3-й и 6-й часы",
  },
  "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului „Moldovenească”": {
    en: "Morning prayers, Third and Sixth Hours, Akathist to the Moldavian Icon of the Mother of God",
    ru: "Утренние молитвы, 3-й и 6-й часы, акафист Молдавской иконе Божией Матери",
  },
  "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului „Potir Nesecat”": {
    en: "Morning prayers, Third and Sixth Hours, Akathist to the Mother of God “The Inexhaustible Cup”",
    ru: "Утренние молитвы, 3-й и 6-й часы, акафист Божией Матери «Неупиваемая Чаша»",
  },
  "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Maicii Domnului": {
    en: "Morning prayers, Third and Sixth Hours, Akathist to the Mother of God",
    ru: "Утренние молитвы, 3-й и 6-й часы, акафист Божией Матери",
  },
  "Rugăciunile dimineții, Ceasurile 3 și 6, Acatistul Sf. Ierarh Nicolae": {
    en: "Morning prayers, Third and Sixth Hours, Akathist to St Nicholas",
    ru: "Утренние молитвы, 3-й и 6-й часы, акафист святителю Николаю",
  },
  "Rugăciunile dimineții, Miezonoptica, Ceasurile 3 și 6, Acatistul zilei": {
    en: "Morning prayers, Midnight Office, Third and Sixth Hours, Akathist of the day",
    ru: "Утренние молитвы, полунощница, 3-й и 6-й часы, акафист дня",
  },
  "Sfânta Liturghie în biserica din trapeză „Sf. Ierarh Nicolae”": {
    en: "Divine Liturgy in the refectory church of St Nicholas",
    ru: "Божественная литургия в трапезном храме святителя Николая",
  },
  "Sfânta Liturghie în biserica „Nașterea Maicii Domnului”": {
    en: "Divine Liturgy in the Church of the Nativity of the Theotokos",
    ru: "Божественная литургия в храме Рождества Пресвятой Богородицы",
  },
  "Sfânta Liturghie în biserica „Sf. Treime”": {
    en: "Divine Liturgy in the Church of the Holy Trinity",
    ru: "Божественная литургия в Свято-Троицком храме",
  },
  "Sfânta Liturghie": { en: "Divine Liturgy", ru: "Божественная литургия" },
  "Tedeum la icoana Maicii Domnului „Potir Nesecat”": {
    en: "Moleben before the icon of the Mother of God “The Inexhaustible Cup”",
    ru: "Молебен у иконы Божией Матери «Неупиваемая Чаша»",
  },
  "Tedeum la moaștele Sf. Cuv. Macarie": {
    en: "Moleben at the relics of Venerable Macarius",
    ru: "Молебен у мощей преподобного Макария",
  },
  "Vecernia și Utrenia": { en: "Vespers and Matins", ru: "Вечерня и утреня" },
  "Vecernia și Utrenia, ceasul 1": { en: "Vespers, Matins and the First Hour", ru: "Вечерня, утреня и 1-й час" },
  "Miercuri la icoana cu o particică de moaște a Sf. Fer. Matrona de la Moscova": {
    en: "On Wednesdays at the icon with a particle of the relics of Blessed Matrona of Moscow",
    ru: "По средам — у иконы с частицей мощей блаженной Матроны Московской",
  },
};

/**
 * The schedule entry for a weekday (0 = Sunday … 6 = Saturday, as Date#getDay).
 * A static page cannot know the date, so call this in the browser with the
 * monastery's own day: new Date().toLocaleString("en-US", { timeZone: "Europe/Chisinau" }).
 */
export function serviceDayFor(weekday: number): ServiceDay | undefined {
  const key = ["sun", "monWed", "monWed", "monWed", "thu", "fri", "sat"][weekday];

  return schedule.find((day) => day.key === key);
}

/** A service name or note in the reader's language; Romanian if untranslated. */
export function serviceText(text: string, lang: string): string {
  if (lang === "en" || lang === "ru") return serviceNames[text]?.[lang] ?? text;
  return text;
}
