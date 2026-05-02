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
        .select("id, name, city, kp_regroupement, kp_regroupement_2, kp_active")
        .eq("is_active", true);
      const { data } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();
      if (cancelled) return;
      if (data) {
        // Collect KP siblings (only when KP is active on the source fiche)
        const ids: string[] = [data.id];
        if (data.kp_active) {
          const kp1 = data.kp_regroupement?.trim();
          const kp2 = data.kp_regroupement_2?.trim();
          const orParts: string[] = [];
          if (kp1) orParts.push(`kp_regroupement.eq.${kp1}`);
          if (kp2) orParts.push(`kp_regroupement_2.eq.${kp2}`);
          if (orParts.length > 0) {
            const { data: siblings } = await supabase
              .from("businesses")
              .select("id")
              .eq("is_active", true)
              .neq("id", data.id)
              .or(orParts.join(","));
            if (siblings) ids.push(...siblings.map((s: any) => s.id));
          }
        }
        const params = new URLSearchParams();
        params.set("openBusiness", data.id);
        params.set("pinIds", ids.join(","));
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
