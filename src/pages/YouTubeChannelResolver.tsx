import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "@/pages/NotFound";
import { useState } from "react";

/**
 * /y/:slug — résout un slug vanity vers la chaîne YouTube correspondante
 * et redirige vers /search avec l'onglet Youtube ouvert sur cette chaîne.
 */
const YouTubeChannelResolver = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = decodeURIComponent(slug).toLowerCase();
      if (!s) { setNotFound(true); return; }
      const { data } = await supabase
        .from("vanity_urls")
        .select("target_type, target_id")
        .eq("slug", s)
        .maybeSingle();
      if (cancelled) return;
      if (!data || data.target_type !== "business") { setNotFound(true); return; }
      navigate(`/search?tab=youtube&openChannel=${data.target_id}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  if (notFound) return <NotFound />;
  return null;
};

export default YouTubeChannelResolver;
