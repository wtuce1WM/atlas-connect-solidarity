import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BookOnlineSlidePanel from "@/components/BookOnlineSlidePanel";
import SlidePanelHeader from "@/components/SlidePanelHeader";
import LoadingScreen from "@/components/LoadingScreen";

const FicheImmersive = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMosaicOpen, setIsMosaicOpen] = useState(false);
  const interceptCloseRef = useRef<(() => boolean) | null>(null);

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

  const handleClose = () => {
    if (interceptCloseRef.current) {
      const handled = interceptCloseRef.current();
      if (handled) return;
    }
    navigate("/");
  };

  const handleSearch = useCallback((params: { q?: string; category?: string; city?: string }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.city) sp.set("city", params.city);
    navigate(`/recherche?${sp.toString()}`);
  }, [navigate]);

  const handleSearchBusinessSelect = useCallback((bizId: string) => {
    setBusinessId(bizId);
  }, []);

  if (loading) return <LoadingScreen />;

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-lg">Établissement introuvable</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-visible">
      {!isMosaicOpen && (
        <SlidePanelHeader
          onClose={handleClose}
          mobileTransparent
        />
      )}
      <div className="flex-1 min-h-0">
        <BookOnlineSlidePanel
          businessId={businessId}
          onClose={() => navigate("/")}
          interceptCloseRef={interceptCloseRef}
          showSearchBar
          onMosaicStateChange={setIsMosaicOpen}
          onSearch={handleSearch}
          onSearchBusinessSelect={handleSearchBusinessSelect}
        />
      </div>
    </div>
  );
};

export default FicheImmersive;
