import { useEffect, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { readLastHomepageCity } from "@/lib/cityHomepage";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix, type SiteLanguage } from "@/lib/localizedPath";

/** Slugify a hashtag label: "#Agenda Culturel" → "agenda-culturel" */
export function hashtagSlug(name: string): string {
  return name
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Clean shareable route `/hashtag/:label` (and `/en/hashtag/:label`, `/ar/...`).
 * Resolves the badge by slug then redirects to the canonical search view.
 */
const HashtagResolver = () => {
  const { label } = useParams();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [target, setTarget] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!label) { setNotFound(true); return; }
      const { data } = await (supabase as any)
        .from("badges")
        .select("id, name_fr")
        .like("name_fr", "#%");
      const badges = ((data as any[]) || []) as { id: string; name_fr: string }[];
      const wanted = hashtagSlug(decodeURIComponent(label));
      const match = badges.find((b) => hashtagSlug(b.name_fr) === wanted);
      if (cancelled) return;
      if (!match) { setNotFound(true); return; }
      const city = searchParams.get("city") || readLastHomepageCity() || "Marrakech";
      const sp = new URLSearchParams();
      sp.set("city", city);
      sp.set("badgeId", match.id);
      sp.set("badgeLabel", match.name_fr);
      setTarget(`${withLangPrefix("/search", language as SiteLanguage)}?${sp.toString()}`);
    })();
    return () => { cancelled = true; };
  }, [label, language, searchParams]);

  if (notFound) return <Navigate to={withLangPrefix("/search", language as SiteLanguage)} replace />;
  if (target) return <Navigate to={target} replace />;
  return null;
};

export default HashtagResolver;
