/**
 * URL prefix helpers for multilingual routing.
 *
 * URL structure:
 *   /fiche/x       → French (canonical, no prefix)
 *   /en/fiche/x    → English
 *   /ar/fiche/x    → Arabic
 *
 * FR is the default: no `/fr/` prefix, preserves existing SEO.
 */

export type SiteLanguage = "fr" | "en" | "ar";

const PREFIXED: SiteLanguage[] = ["en", "ar"];

/** Detect the language of a full pathname (e.g. `/en/fiche/x`). */
export function getLangFromPath(pathname: string): SiteLanguage {
  for (const l of PREFIXED) {
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return "fr";
}

/** Return the pathname without any language prefix (`/en/fiche/x` → `/fiche/x`). */
export function stripLangPrefix(pathname: string): string {
  for (const l of PREFIXED) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
  }
  return pathname;
}

/** Build a pathname prefixed for the given language.
 *  Accepts either a prefixed or unprefixed source path. */
export function withLangPrefix(pathname: string, lang: SiteLanguage): string {
  const clean = stripLangPrefix(pathname);
  if (lang === "fr") return clean;
  if (clean === "/") return `/${lang}`;
  return `/${lang}${clean}`;
}

/** Absolute SITE_URL (used for canonical/og/hreflang). */
export const SITE_URL = "https://oneworldmorocco.com";

/** Build a full absolute URL for a given path + language. */
export function buildLangUrl(pathnameWithoutPrefix: string, lang: SiteLanguage): string {
  return `${SITE_URL}${withLangPrefix(pathnameWithoutPrefix, lang)}`;
}
