import { useLocation, matchPath } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PAGE_META } from "./pageMeta";

// Ordered list of route patterns (most specific first) so /blog/typographie
// wins over /blog/:slug, etc. We exclude the bare "*" sentinel and
// "/:vanitySlug" from the priority list — they're tried last.
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
  // Fallback: vanity slug (1 segment), else 404.
  if (matchPath({ path: "/:vanitySlug", end: true }, pathname)) {
    return { pattern: "/:vanitySlug", meta: PAGE_META["/:vanitySlug"] };
  }
  return { pattern: "*", meta: PAGE_META["*"] };
}

export default function RouteSeo() {
  const { pathname } = useLocation();
  const { meta } = resolveRouteMeta(pathname);
  if (!meta) return null;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
    </Helmet>
  );
}
