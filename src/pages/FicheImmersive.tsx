import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import LoadingScreen from "@/components/LoadingScreen";

const FicheImmersive = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setBusinessId(data.id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <LoadingScreen />;

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-lg">Établissement introuvable</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50">
      <BookOnlineSlidePanel
        businessId={businessId}
        onClose={() => navigate("/")}
        isExpanded
      />
    </div>
  );
};

export default FicheImmersive;
