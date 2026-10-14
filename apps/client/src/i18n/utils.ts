import { defaultLocale, locales, ui } from "@i18n";
import type { AllTranslationKeys, Locale } from "@i18n";
import { stripBasePath, withBasePath } from "@utils/paths";

function isKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

function getNestedValue(obj: object | undefined, path: string): string | undefined {
  const keys = path.split(".");

  let current = obj;

  for (const k of keys) {
    if (current && typeof current === "object" && isKey(current, k)) {
      current = current[k];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

export function useTranslations(lang: Locale) {
  return (key: AllTranslationKeys): string => {
    const translation = getNestedValue(ui[lang], key);

    if (translation) {
      return translation;
    }

    const defaultTranslation = getNestedValue(ui[defaultLocale], key);

    if (defaultTranslation) {
      return defaultTranslation;
    }

    return key;
  };
}
export type UseTranslations = ReturnType<typeof useTranslations>;

export function getLocaleFromUrl(url: URL): Locale {
  const [, langSegment] = stripBasePath(url.pathname).split("/");
  const lang = langSegment?.replace(/\.html$/, "");

  if (lang && lang in ui) {
    return lang as Locale;
  }

  return defaultLocale;
}

export function getLocalizedPath(path: string, locale: Locale): string {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const pathname = stripBasePath((hashIndex === -1 ? path : path.slice(0, hashIndex)).replace(/\.html$/, ""));
  const segments = pathname.split("/").filter(Boolean);
  const pathWithoutLocale = segments[0] && segments[0] in locales ? segments.slice(1) : segments;
  const localizedPath = locale === defaultLocale ? pathWithoutLocale : [locale, ...pathWithoutLocale];

  const localizedUrlPath = `/${localizedPath.join("/")}`;
  const localizedUrl = `${localizedUrlPath === "/" ? localizedUrlPath : `${localizedUrlPath}/`}${hash}`;

  return withBasePath(localizedUrl);
}

/**
 * A phone number as the monastery writes it ("0254 78600", "+373 254 78737")
 * → a dialable tel: href in international form ("tel:+37325478600").
 */
export function telHref(display: string): string {
  const digits = display.replace(/[^\d+]/g, "");

  return `tel:${digits.startsWith("+") ? digits : `+373${digits.replace(/^0/, "")}`}`;
}
