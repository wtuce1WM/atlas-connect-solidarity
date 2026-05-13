import { useEffect } from "react";

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
 */
export function useSEO({ title, description, canonical, ogImage, ogUrl, ogType, jsonLd }: SEOOptions) {
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
