import { useEffect, useState } from "react";
import { resolveRouteMeta } from "@/seo/RouteSeo";
import { getOverride, subscribeOverrides } from "@/seo/pageMetaOverrides";
import { getLangFromPath, stripLangPrefix, withLangPrefix } from "@/lib/localizedPath";

interface SEOOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "ONE WORLD MOROCCO";
const BASE_URL = "https://oneworldmorocco.com";

/**
 * Sets document.title, meta description, canonical link and optional JSON-LD.
 * Cleans up on unmount (restores defaults).
 *
 * Emits hreflang link tags for FR/EN/AR + x-default so translated variants
 * are discoverable by search engines. Canonical is self-referential and
 * carries the current language prefix (Google requirement).
 *
 * Back-office overrides (public.page_meta_overrides) take precedence over the
 * hard-coded title/description passed in, so staff edits in Présentation / Pages
 * apply to static pages that call useSEO (Homepage, etc.).
 */
export function useSEO(opts: SEOOptions) {
  // Re-run the effect when overrides load/change.
  const [overridesVersion, setOverridesVersion] = useState(0);
  useEffect(() => {
    const unsub = subscribeOverrides(() => setOverridesVersion((n) => n + 1));
    return () => { unsub(); };
  }, []);

  const currentFullPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const cleanPath = stripLangPrefix(currentFullPath);
  const currentLang = getLangFromPath(currentFullPath);

  const { pattern } = resolveRouteMeta(cleanPath);
  const override = getOverride(pattern);
  const title = override?.title || opts.title;
  const description = override?.description || opts.description;
  const ogImage = override?.og_image || opts.ogImage;
  const ogType = (override?.og_type as string | undefined) || opts.ogType;
  const { canonical, ogUrl, jsonLd } = opts;

  useEffect(() => {

    // Title — keep under 60 chars; only append site name if not already present
    const prevTitle = document.title;
    document.title = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = metaDesc?.content ?? "";
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // Canonical — self-referential with current language prefix.
    // If caller passes a canonical (typically a clean route path), we still
    // localize it. If it's an absolute URL, it's used as-is (opt-out).
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = linkCanonical?.href ?? "";
    if (canonical || cleanPath) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.rel = "canonical";
        document.head.appendChild(linkCanonical);
      }
      if (canonical?.startsWith("http")) {
        linkCanonical.href = canonical;
      } else {
        const basePath = canonical ? stripLangPrefix(canonical) : cleanPath;
        linkCanonical.href = `${BASE_URL}${withLangPrefix(basePath, currentLang)}`;
      }
    }

    // Hreflang tags — one per supported language + x-default (FR fallback).
    // Managed under a dedicated class so we can clean up on unmount.
    const HREFLANG_CLASS = "seo-hreflang-managed";
    document.querySelectorAll(`link.${HREFLANG_CLASS}`).forEach((el) => el.remove());
    const hreflangBase = canonical && !canonical.startsWith("http")
      ? stripLangPrefix(canonical)
      : cleanPath;
    const langsToEmit: Array<{ code: string; lang: "fr" | "en" | "ar" }> = [
      { code: "fr", lang: "fr" },
      { code: "en", lang: "en" },
      { code: "ar", lang: "ar" },
      { code: "x-default", lang: "fr" },
    ];
    const createdHreflangs: HTMLLinkElement[] = [];
    for (const { code, lang } of langsToEmit) {
      const el = document.createElement("link");
      el.rel = "alternate";
      el.hreflang = code;
      el.href = `${BASE_URL}${withLangPrefix(hreflangBase, lang)}`;
      el.className = HREFLANG_CLASS;
      document.head.appendChild(el);
      createdHreflangs.push(el);
    }

    // JSON-LD
    let scriptEl: HTMLScriptElement | null = null;

    // OG & Twitter meta tags
    const ogMetas: { property: string; content: string }[] = [];
    if (title) {
      ogMetas.push({ property: "og:title", content: document.title });
      ogMetas.push({ property: "twitter:title", content: document.title });
    }
    if (description) {
      ogMetas.push({ property: "og:description", content: description });
      ogMetas.push({ property: "twitter:description", content: description });
    }
    if (ogImage) {
      ogMetas.push({ property: "og:image", content: ogImage });
      ogMetas.push({ property: "twitter:image", content: ogImage });
    }
    if (ogUrl) {
      const fullUrl = ogUrl.startsWith("http") ? ogUrl : `${BASE_URL}${withLangPrefix(stripLangPrefix(ogUrl), currentLang)}`;
      ogMetas.push({ property: "og:url", content: fullUrl });
    } else {
      ogMetas.push({ property: "og:url", content: `${BASE_URL}${withLangPrefix(cleanPath, currentLang)}` });
    }
    if (ogType) {
      ogMetas.push({ property: "og:type", content: ogType });
    }
    ogMetas.push({
      property: "og:locale",
      content: currentLang === "ar" ? "ar_MA" : currentLang === "en" ? "en_US" : "fr_FR",
    });

    const prevOgValues: { el: HTMLMetaElement; prev: string }[] = [];
    for (const { property, content } of ogMetas) {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      prevOgValues.push({ el, prev: el.content });
      el.content = content;
    }

    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.id = "seo-jsonld-page";
      scriptEl.textContent = JSON.stringify(jsonLd);
      // Remove any previous page-level JSON-LD
      document.getElementById("seo-jsonld-page")?.remove();
      document.head.appendChild(scriptEl);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.content = prevDesc;
      if (linkCanonical && prevCanonical) linkCanonical.href = prevCanonical;
      scriptEl?.remove();
      createdHreflangs.forEach((el) => el.remove());
      for (const { el, prev } of prevOgValues) {
        el.content = prev;
      }
    };
  }, [title, description, canonical, ogImage, ogUrl, ogType, jsonLd, currentLang, cleanPath]);
}

