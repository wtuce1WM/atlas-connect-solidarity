import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import SlidePanelHome from "@/components/SlidePanelHome";

interface Props {
  city: string;
  onLabelClick?: (info: { label: string; kind: "entry" | "extra"; badgeId: string | null }) => void;
}

interface CardData {
  videoId: string | null;
  videoUrl: string | null;
  thumbnail: string | null;
  businessName: string | null;
  ownerLogo: string | null;
  ownerName: string | null;
  ownerId: string | null;
  rating: number | null;
  reviewCount: number | null;
  label: string | null;
  badgeId?: string | null;
}

interface MixedSlot {
  key: string;
  kind: "entry" | "extra";
  data: CardData;
}

const HomepageCardsFront = ({ city, onLabelClick }: Props) => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<MixedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isFirstLoad.current) setLoading(true);

      const { data, error } = await (supabase as any)
        .from("homepage_cards_snapshots")
        .select("payload")
        .eq("city", city)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("[HomepageCardsFront] snapshot error", error);
        setSlots([]);
      } else {
        const payload = (data?.payload as MixedSlot[] | null) || [];
        setSlots(payload);
      }
      setLoading(false);
      isFirstLoad.current = false;
    };
    load();
    return () => { cancelled = true; };
  }, [city]);

  // Playable slots only (have a video)
  const playableIndices = slots
    .map((s, i) => (s.data.videoId ? i : -1))
    .filter((i) => i >= 0);

  const activeSlot = activeIndex !== null ? slots[activeIndex] : null;
  const activePosInPlayable = activeIndex !== null ? playableIndices.indexOf(activeIndex) : -1;
  const hasPrev = activePosInPlayable > 0;
  const hasNext = activePosInPlayable >= 0 && activePosInPlayable < playableIndices.length - 1;

  const goPrev = () => {
    if (!hasPrev) return;
    setActiveIndex(playableIndices[activePosInPlayable - 1]);
    setCurrentTime(0);
  };
  const goNext = () => {
    if (!hasNext) return;
    setActiveIndex(playableIndices[activePosInPlayable + 1]);
    setCurrentTime(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-8 text-center border border-dashed rounded-lg">
        Aucune carte à afficher pour {city}.
      </div>
    );
  }

  const handleLabelActivate = (slot: MixedSlot) => {
    const label = slot.data.label;
    if (!label) return;

    if (onLabelClick) {
      setActiveIndex(null);
      setCurrentTime(0);
      onLabelClick({ label, kind: slot.kind, badgeId: slot.data.badgeId ?? null });
      return;
    }

    const q = slot.kind === "entry" ? label : `${label} ${city}`;
    navigate(`/search?q=${encodeURIComponent(q)}&_t=${Date.now()}`);
  };

  const renderCard = (slot: MixedSlot, index: number) => {
    const it = slot.data;
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);

    if (!it.videoId) {
      return (
        <div className="relative aspect-[9/16] rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground text-center px-2">
          <span>{it.label || "Aucune vidéo"}</span>
          {it.label && (
            <div className="absolute inset-x-0 top-[10%] z-[8] flex items-center justify-center px-2">
              <button
                type="button"
                onClick={() => handleLabelActivate(slot)}
                className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-gold/90 transition-colors"
              >
                {it.label}
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group w-full">
        <button
          type="button"
          onClick={() => { setCurrentTime(0); setActiveIndex(index); }}
          className="absolute inset-0 w-full h-full text-left"
          aria-label={`Lire ${it.label || it.businessName || ""}`}
        >
          {it.thumbnail ? (
            <img src={it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading="lazy" />
          ) : isFileVideo && it.videoUrl ? (
            <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
          {it.rating != null && (
            <div className="absolute top-1.5 left-1.5 right-1.5 z-[5] flex items-center gap-1 text-[10px]">
              <Star className="h-2.5 w-2.5 text-gold fill-gold" />
              <span className="font-medium text-white">{it.rating}/20</span>
              {(it.reviewCount ?? 0) > 0 && (
                <span className="text-white/70">· {it.reviewCount} avis</span>
              )}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/50 group-hover:bg-black/70 transition-colors flex items-center justify-center">
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white ml-0.5" />
            </div>
          </div>
          {it.ownerLogo && (
            <div className="absolute inset-x-0 bottom-[15%] z-[6] flex items-center justify-center px-2 pointer-events-none">
              <img
                src={it.ownerLogo}
                alt={it.ownerName || ""}
                className="max-w-[100px] max-h-[72px] object-contain"
                style={{ filter: "drop-shadow(0 0 1px hsla(0,0%,0%,0.9)) drop-shadow(0 0 3px hsla(0,0%,0%,0.7)) drop-shadow(0 2px 8px hsla(0,0%,0%,0.5))" }}
              />
            </div>
          )}
          {it.businessName && (
            <div className="absolute bottom-0 left-0 right-0 p-1.5">
              <p className="text-[10px] font-medium text-white line-clamp-1">{it.businessName}</p>
            </div>
          )}
        </button>
        {it.label && (
          <div className="absolute inset-x-0 top-[10%] z-[8] flex items-center justify-center px-2">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLabelActivate(slot);
              }}
              className="px-2.5 py-1 rounded-md bg-gold text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-gold/90 transition-colors"
            >
              {it.label}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className={`grid gap-4 ${activeSlot ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"}`}>
        {slots.map((slot, index) => (
          <div key={slot.key}>
            {renderCard(slot, index)}
          </div>
        ))}
      </div>

      <SlidePanelHome
        open={activeSlot !== null}
        onClose={() => setActiveIndex(null)}
        videoUrl={activeSlot?.data.videoUrl ?? null}
        videoId={activeSlot?.data.videoId ?? null}
        businessName={activeSlot?.data.businessName || activeSlot?.data.label || ""}
        isGeneric={false}
        currentTime={currentTime}
        onTimeUpdate={setCurrentTime}
        onPrev={goPrev}
        onNext={goNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        owner={
          activeSlot && activeSlot.data.ownerId
            ? { id: activeSlot.data.ownerId, name: activeSlot.data.ownerName || "", logo_url: activeSlot.data.ownerLogo }
            : null
        }
        social={null}
        description={null}
      />
    </div>
  );
};

export default HomepageCardsFront;
