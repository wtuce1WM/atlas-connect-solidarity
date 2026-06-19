import { useEffect, useState } from "react";
import { resolveRouteMeta } from "@/seo/RouteSeo";
import { getOverride, subscribeOverrides } from "@/seo/pageMetaOverrides";

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
const SITE_TAGLINE = "";
const BASE_URL = "https://oneworldmorocco.com";

/**
 * Sets document.title, meta description, canonical link and optional JSON-LD.
 * Cleans up on unmount (restores defaults).
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

  const { pattern } = resolveRouteMeta(
    typeof window !== "undefined" ? window.location.pathname : "/",
  );
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

    // Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = linkCanonical?.href ?? "";
    if (canonical) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.rel = "canonical";
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = canonical.startsWith("http") ? canonical : `${BASE_URL}${canonical}`;
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
      const fullUrl = ogUrl.startsWith("http") ? ogUrl : `${BASE_URL}${ogUrl}`;
      ogMetas.push({ property: "og:url", content: fullUrl });
    }
    if (ogType) {
      ogMetas.push({ property: "og:type", content: ogType });
    }

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
      for (const { el, prev } of prevOgValues) {
        el.content = prev;
      }
    };
  }, [title, description, canonical, ogImage, ogUrl, ogType, jsonLd]);
}
