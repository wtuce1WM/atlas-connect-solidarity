import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";
import { useState } from "react";

/**
 * /y/:slug — résout un slug vanity vers la chaîne YouTube correspondante
 * et redirige vers /search avec l'onglet Youtube ouvert sur cette chaîne.
 */
const YouTubeChannelResolver = () => {
  const { slug = "" } = useParams();
  const navigate = useLocalizedNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = decodeURIComponent(slug).toLowerCase();
      if (!s) { setNotFound(true); return; }
      // 1) Try vanity_urls
      const { data: vanity } = await supabase
        .from("vanity_urls")
        .select("target_type, target_id")
        .eq("slug", s)
        .maybeSingle();
      if (cancelled) return;
      let businessId: string | null = null;
      if (vanity && vanity.target_type === "business") {
        businessId = vanity.target_id as string;
      } else {
        // 2) Fallback: resolve directly via businesses.slug
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", s)
          .maybeSingle();
        if (cancelled) return;
        if (biz?.id) businessId = biz.id as string;
      }
      if (!businessId) { setNotFound(true); return; }
      navigate(`/search?tab=youtube&openChannel=${businessId}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (notFound) return <NotFound />;
  return null;
};

export default YouTubeChannelResolver;
