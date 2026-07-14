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
  const { pattern, meta: baseMeta } = resolveRouteMeta(pathname);
  if (!baseMeta) return null;
  if (DYNAMIC_PATTERNS.has(pattern)) return null;
  const meta = mergeMeta(pattern, baseMeta);

  const url = `${SITE_URL}${pathname}`;
  const ogType = meta.ogType ?? "website";
  const ogImage = meta.ogImage;

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {ogImage && <meta name="twitter:card" content="summary_large_image" />}
    </Helmet>
  );
}
