import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix } from "@/lib/localizedPath";

/**
 * Resolves /destination/:destinationName to the immersive Destination
 * slide panel embedded inside /search, mirroring /fiche/:slug behaviour.
 */
const DestinationResolver = () => {
  const { destinationName } = useParams<{ destinationName: string }>();
  const { language } = useLanguage();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!destinationName) return;
    let cancelled = false;
    (async () => {
      const decoded = decodeURIComponent(destinationName);
      const { data } = await (supabase
        .from("destinations" as any)
        .select("id, name_fr, city_ids")
        .eq("name_fr", decoded)
        .maybeSingle() as any);
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        return;
      }
      const params = new URLSearchParams();
      params.set("openDestination", data.id);
      const firstCityId = Array.isArray(data.city_ids) ? data.city_ids[0] : null;
      if (firstCityId) {
        const { data: city } = await (supabase
          .from("cities" as any)
          .select("name_fr")
          .eq("id", firstCityId)
          .maybeSingle() as any);
        if (city?.name_fr) params.set("city", city.name_fr);
      }
      setRedirectTo(withLangPrefix(`/search?${params.toString()}`, language));
    })();
    return () => { cancelled = true; };
  }, [destinationName, language]);

  if (notFound) return <Navigate to={withLangPrefix("/search", language)} replace />;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return null;
};

export default DestinationResolver;
