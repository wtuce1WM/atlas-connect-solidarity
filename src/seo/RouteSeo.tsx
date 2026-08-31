import { useLocation, matchPath } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PAGE_META } from "./pageMeta";
import { mergeMeta } from "./pageMetaOverrides";
import { usePageMetaOverridesVersion } from "./usePageMetaOverrides";
import { getLangFromPath, stripLangPrefix, withLangPrefix, SITE_URL } from "@/lib/localizedPath";

// Routes that manage their own SEO dynamically via useSEO (data-driven titles,
// descriptions, OG images, JSON-LD). RouteSeo must NOT inject a generic
// fallback for these — it would race with useSEO and clobber the real meta.
export const DYNAMIC_PATTERNS = new Set([
  "/blog/:slug",
  "/fiche/:slug",
  "/business/:slug",
  "/category/:categoryName",
  "/subcategory/:subcategoryName",
  "/service/*",
  "/city/:city",
  "/neighborhood/:neighborhood",
  "/destination/:destinationName",
  "/y/:slug",
  "/u/:pseudo",
  "/b/:slug",
  "/:vanitySlug",
]);

const NOINDEX_PATTERNS = new Set<string>([
  // Snapshot homepage — jamais indexée
  "/home_v1",
]);

const PRIORITY_PATTERNS = Object.keys(PAGE_META)
  .filter((p) => p !== "*" && p !== "/:vanitySlug")
  .sort((a, b) => {
    const score = (p: string) =>
      (p.includes(":") || p.includes("*") ? 0 : 1) * 1000 + p.length;
    return score(b) - score(a);
  });

export function resolveRouteMeta(pathname: string) {
  for (const pattern of PRIORITY_PATTERNS) {
    if (matchPath({ path: pattern, end: pattern.includes("*") ? false : true }, pathname)) {
      return { pattern, meta: PAGE_META[pattern] };
    }
  }
  if (matchPath({ path: "/:vanitySlug", end: true }, pathname)) {
    return { pattern: "/:vanitySlug", meta: PAGE_META["/:vanitySlug"] };
  }
  return { pattern: "*", meta: PAGE_META["*"] };
}

export default function RouteSeo() {
  const { pathname } = useLocation();
  usePageMetaOverridesVersion(); // re-render when overrides change

  // Real pathname carries any /en or /ar prefix; strip for pattern matching
  // but keep prefix for canonical / og:url (self-referential per Google hreflang rules).
  const cleanPath = stripLangPrefix(pathname);
  const currentLang = getLangFromPath(pathname);
  const { pattern, meta: baseMeta } = resolveRouteMeta(cleanPath);

  // Always emit hreflang tags — even for dynamic patterns where useSEO handles the rest.
  const hreflangs = (
    <>
      <link rel="alternate" hrefLang="fr" href={`${SITE_URL}${withLangPrefix(cleanPath, "fr")}`} />
      <link rel="alternate" hrefLang="en" href={`${SITE_URL}${withLangPrefix(cleanPath, "en")}`} />
      <link rel="alternate" hrefLang="ar" href={`${SITE_URL}${withLangPrefix(cleanPath, "ar")}`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${withLangPrefix(cleanPath, "fr")}`} />
    </>
  );

  if (!baseMeta) return <Helmet>{hreflangs}</Helmet>;
  if (DYNAMIC_PATTERNS.has(pattern)) return <Helmet>{hreflangs}</Helmet>;

  const meta = mergeMeta(pattern, baseMeta);
  const url = `${SITE_URL}${withLangPrefix(cleanPath, currentLang)}`;
  const ogType = meta.ogType ?? "website";
  const ogImage = meta.ogImage;
  const ogLocale = currentLang === "ar" ? "ar_MA" : currentLang === "en" ? "en_US" : "fr_FR";

  return (
    <Helmet>
      <html lang={currentLang} dir={currentLang === "ar" ? "rtl" : "ltr"} />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {NOINDEX_PATTERNS.has(cleanPath) && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />
      {hreflangs}
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content={ogLocale} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {ogImage && <meta name="twitter:card" content="summary_large_image" />}
    </Helmet>
  );
}
