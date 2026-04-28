import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const MAP_BG_URL =
  "https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=31.6295,-7.9811&zoom=6&maptype=roadmap";

const BackdropMap = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen w-full overflow-hidden bg-black">
    <iframe
      src={MAP_BG_URL}
      className="absolute inset-0 w-full h-full border-0 pointer-events-none"
      tabIndex={-1}
      aria-hidden="true"
      loading="eager"
      title="Background map"
    />
    <div className="absolute inset-0 backdrop-blur-md bg-black/40" />
    <div className="relative z-10 flex items-center justify-center min-h-screen">
      {children}
    </div>
  </div>
);

const FicheImmersive = () => {
  const { slug } = useParams<{ slug: string }>();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase
        .from("businesses")
        .select("id, name, city")
        .eq("is_active", true);
      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data) {
        // Build a search URL with the business name as query so the page has context
        const params = new URLSearchParams();
        params.set("openBusiness", data.id);
        if (data.name) params.set("q", data.name);
        if (data.city) params.set("t", data.city);
        setRedirectTo(`/search?${params.toString()}`);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <BackdropMap>
        <div className="animate-pulse text-white text-lg font-medium tracking-wide">
          Chargement…
        </div>
      </BackdropMap>
    );
  }

  if (notFound) {
    return (
      <BackdropMap>
        <p className="text-lg text-white/90 font-medium">Établissement introuvable</p>
      </BackdropMap>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return null;
};

export default FicheImmersive;
