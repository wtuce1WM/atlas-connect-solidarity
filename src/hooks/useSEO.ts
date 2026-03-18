import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = "ONE WORLD MOROCCO";
const SITE_TAGLINE = "1ère plateforme de e-commerce solidaire au Maroc";
const BASE_URL = "https://oneworldmorocco.com";

/**
 * Sets document.title, meta description, canonical link and optional JSON-LD.
 * Cleans up on unmount (restores defaults).
 */
export function useSEO({ title, description, canonical, jsonLd }: SEOOptions) {
  useEffect(() => {
    // Title
    const prevTitle = document.title;
    document.title = title.includes(SITE_NAME) ? `${title} – ${SITE_TAGLINE}` : `${title} | ${SITE_NAME} – ${SITE_TAGLINE}`;

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
    };
  }, [title, description, canonical, jsonLd]);
}
