import { forwardRef } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";

const NON_LOCALIZED_PREFIXES = ["/staff", "/affiliates", "/api", "/functions", "/auth/callback"];

function shouldLocalize(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return !NON_LOCALIZED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Drop-in replacement for react-router's <Link>. Automatically applies the
 * current language prefix to internal string `to` targets.
 */
export const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps>(function LocalizedLink(
  { to, ...rest },
  ref
) {
  const { language } = useLanguage();

  let target: LinkProps["to"] = to;
  if (typeof to === "string") {
    target = shouldLocalize(to) ? withLangPrefix(to, language) : to;
  } else if (to && typeof to === "object" && "pathname" in to && typeof to.pathname === "string" && shouldLocalize(to.pathname)) {
    target = { ...to, pathname: withLangPrefix(to.pathname, language) };
  }

  return <Link ref={ref} to={target} {...rest} />;
});
