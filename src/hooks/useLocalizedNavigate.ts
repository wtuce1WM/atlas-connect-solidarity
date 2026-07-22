import { useCallback } from "react";
import { useNavigate, type NavigateOptions, type To } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";

/**
 * Routes that must NOT be language-prefixed (no localized variants).
 */
const NON_LOCALIZED_PREFIXES = [
  "/staff",
  "/affiliates",
  "/api",
  "/functions",
  "/auth/callback",
];

function shouldLocalize(path: string): boolean {
  if (!path.startsWith("/")) return false; // external, relative, hash-only
  if (path.startsWith("//")) return false; // protocol-relative
  return !NON_LOCALIZED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Drop-in replacement for `useNavigate()` that automatically applies the
 * current language prefix to internal string paths (e.g. "/search" → "/en/search").
 *
 * - Skips staff/affiliates/api routes and external/hash/relative URLs.
 * - Passes `To` objects (with `pathname`) through with the pathname prefixed.
 * - Numeric deltas (navigate(-1)) pass through untouched.
 * - Preserves NavigateOptions ({ replace, state, ... }).
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      if (typeof to === "string") {
        const next = shouldLocalize(to) ? withLangPrefix(to, language) : to;
        navigate(next, options);
        return;
      }
      // To object: { pathname, search, hash }
      if (to && typeof to === "object" && "pathname" in to && typeof to.pathname === "string" && shouldLocalize(to.pathname)) {
        navigate({ ...to, pathname: withLangPrefix(to.pathname, language) }, options);
        return;
      }
      navigate(to, options);
    },
    [navigate, language]
  );
}
