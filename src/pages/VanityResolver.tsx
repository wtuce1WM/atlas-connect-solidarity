import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";
import { useState } from "react";

// Routes already used at root — never treat as a vanity slug.
const RESERVED = new Set([
  "", "videos", "ancien-index", "business", "city", "category", "service",
  "search", "staff", "affiliates", "devenir-affilie", "mission", "contact",
  "blog", "neighborhood", "carte", "subcategory", "hotels", "club",
  "search-analytics", "destination", "conditions-generales", "unsubscribe",
  "fiche", "test", "install", "corporate",
]);

const VanityResolver = () => {
  const { vanitySlug = "" } = useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const slug = decodeURIComponent(vanitySlug).toLowerCase();
    if (!slug || RESERVED.has(slug.split("/")[0])) {
      setNotFound(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("vanity_urls")
        .select("target_type, target_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setNotFound(true); return; }

      if (data.target_type === "business") {
        const { data: biz } = await supabase
          .from("businesses").select("slug").eq("id", data.target_id).maybeSingle();
        if (cancelled) return;
        if (biz?.slug) navigate(`/fiche/${biz.slug}`, { replace: true });
        else navigate(`/search?openBusiness=${data.target_id}`, { replace: true });
      } else if (data.target_type === "destination") {
        const { data: dest } = await supabase
          .from("destinations").select("name_fr").eq("id", data.target_id).maybeSingle();
        if (cancelled) return;
        if (dest?.name_fr) navigate(`/destination/${encodeURIComponent(dest.name_fr)}`, { replace: true });
        else setNotFound(true);
      } else {
        setNotFound(true);
      }
    })();
    return () => { cancelled = true; };
  }, [vanitySlug, navigate]);

  if (notFound) return <NotFound />;
  return null;
};

export default VanityResolver;
