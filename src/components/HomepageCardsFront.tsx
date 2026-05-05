import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import SlidePanelHome from "@/components/SlidePanelHome";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { getCached, setCached } from "@/lib/swrCache";

export type HomeCardTarget = { type: "badge" | "event"; id: string } | null;

interface Props {
  city: string;
  onLabelClick?: (info: { label: string; kind: "entry" | "extra"; target: HomeCardTarget; badgeId: string | null; eventId?: string | null; pinnedBusinessId?: string | null }) => void;
  /** If true, clicking a labeled video card triggers the label filter instead of opening the video panel. Used on the Test homepage. */
  labelTakesPriority?: boolean;
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
  eventId?: string | null;
  target?: HomeCardTarget;
  price?: string | null;
  priceType?: string | null;
}

interface MixedSlot {
  key: string;
  kind: "entry" | "extra";
  data: CardData;
}

const HomepageCardsFront = ({ city, onLabelClick, labelTakesPriority = false }: Props) => {
  const navigate = useNavigate();
  const cacheKey = `home:cards:${city}`;
  const cachedInitial = getCached<MixedSlot[]>(cacheKey);
  const [slots, setSlots] = useState<MixedSlot[]>(cachedInitial || []);
  const [loading, setLoading] = useState(!cachedInitial);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDescription, setActiveDescription] = useState<string | null>(null);
  const isFirstLoad = useRef(!cachedInitial);

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
        setLoading(false);
        isFirstLoad.current = false;
        return;
      }

      const payload = (data?.payload as MixedSlot[] | null) || [];

      // PASS 1 — render immediately with the snapshot to unblock LCP
      setSlots(payload);
      setLoading(false);
      isFirstLoad.current = false;

      // PASS 2 — fetch enrichment data in background and patch slots once ready
      const eventIds = [...new Set(payload.map((slot) => slot.data.eventId).filter(Boolean))] as string[];
      const immoVideoIds = [...new Set(
        payload
          .filter((slot) => (slot.data.label || "").trim().toLowerCase() === "immobilier" && slot.data.videoId)
          .map((slot) => slot.data.videoId!)
      )];

      if (eventIds.length === 0 && immoVideoIds.length === 0) return;

      const [eventsRes, immoDocsRes] = await Promise.all([
        eventIds.length > 0
          ? (supabase as any).from("events").select("id, name, images").in("id", eventIds)
          : Promise.resolve({ data: [] }),
        immoVideoIds.length > 0
          ? (supabase as any).from("business_documents").select("id, price, price_type").eq("business_is_active", true).in("id", immoVideoIds)
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;

      const eventMap = new Map<string, any>(((eventsRes.data as any[]) || []).map((e) => [e.id, e]));
      const immoMap = new Map<string, any>(((immoDocsRes.data as any[]) || []).map((d) => [d.id, d]));

      setSlots(payload.map((slot) => {
        let next = slot;
        const event = slot.data.eventId ? eventMap.get(slot.data.eventId) : null;
        if (event) {
          next = {
            ...next,
            data: {
              ...next.data,
              videoId: null,
              videoUrl: null,
              thumbnail: event.images?.[0] || null,
              businessName: event.name || next.data.businessName,
              ownerLogo: null,
              ownerName: null,
              ownerId: null,
              rating: null,
              reviewCount: null,
            },
          };
        }
        const immo = next.data.videoId ? immoMap.get(next.data.videoId) : null;
        if (immo && (next.data.label || "").trim().toLowerCase() === "immobilier") {
          next = {
            ...next,
            data: { ...next.data, price: immo.price ?? null, priceType: immo.price_type ?? null },
          };
        }
        return next;
      }));
    };
    load();
    return () => { cancelled = true; };
  }, [city]);

  // Note: LCP image priority is handled inline via fetchPriority="high" on the first <img>.
  // No dynamic <link rel="preload"> here — it competed with the JS bundle for bandwidth
  // and degraded FCP on mobile.

  // Playable slots only (have a video)
  const playableIndices = slots
    .map((s, i) => (s.data.videoId ? i : -1))
    .filter((i) => i >= 0);

  const activeSlot = activeIndex !== null ? slots[activeIndex] : null;
  const activePosInPlayable = activeIndex !== null ? playableIndices.indexOf(activeIndex) : -1;
  const hasPrev = activePosInPlayable > 0;
  const hasNext = activePosInPlayable >= 0 && activePosInPlayable < playableIndices.length - 1;

  // Fetch description of the active business so the green "+" overlay can render in SlidePanelHome.
  useEffect(() => {
    const ownerId = activeSlot?.data.ownerId;
    if (!ownerId) { setActiveDescription(null); return; }
    let cancelled = false;
    (supabase as any)
      .from("businesses")
      .select("description")
      .eq("id", ownerId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!cancelled) setActiveDescription(data?.description ?? null);
      });
    return () => { cancelled = true; };
  }, [activeSlot?.data.ownerId]);

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
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-[9/16] rounded-lg bg-muted/40 overflow-hidden animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
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

  // A "manual business card": ONLY manual extra cards (kind === "extra") linked to a
  // single establishment, with no badge/event filter. Clicking it should open the
  // business slide panel on the Search page (same as "En savoir +" CTA in SlidePanelHome).
  // Regular video cards (kind === "entry") must keep their normal video-player behavior.
  const isDirectBusinessCard = (slot: MixedSlot) => {
    const d = slot.data;
    return slot.kind === "extra" && !!d.ownerId && !d.badgeId && !d.eventId && !d.target;
  };

  const handleLabelActivate = (slot: MixedSlot) => {
    if (isDirectBusinessCard(slot) && slot.data.ownerId) {
      // Store return context exactly like the "En savoir +" CTA in SlidePanelHome,
      // so closing the SlidePanel on /search returns to this homepage state.
      try {
        if (slot.data.videoId) {
          sessionStorage.setItem("returnToTestVideoId", slot.data.videoId);
        } else {
          sessionStorage.removeItem("returnToTestVideoId");
        }
        const ctx = window.location.search.replace(/^\?/, "");
        if (ctx) sessionStorage.setItem("returnToTestContext", ctx);
        else sessionStorage.removeItem("returnToTestContext");
      } catch {}
      navigate(`/fiche/${slot.data.ownerId}`);
      return;
    }

    const label = slot.data.label;
    if (!label) return;

    if (onLabelClick) {
      const target: HomeCardTarget =
        slot.data.target ??
        (slot.data.eventId ? { type: "event", id: slot.data.eventId } :
         slot.data.badgeId ? { type: "badge", id: slot.data.badgeId } : null);
      onLabelClick({
        label,
        kind: slot.kind,
        target,
        badgeId: slot.data.badgeId ?? null,
        eventId: slot.data.eventId ?? null,
        // When the card is linked to a specific establishment (manual extra card OR
        // entry-card whose video was forced via front_structure_homepage_overrides),
        // pin that business at the top of the next page.
        pinnedBusinessId: slot.data.ownerId ?? null,
      });
      return;
    }

    const q = slot.kind === "entry" ? label : `${label} ${city}`;
    navigate(`/search?q=${encodeURIComponent(q)}&_t=${Date.now()}`);
  };

  const renderCard = (slot: MixedSlot, index: number) => {
    const it = slot.data;
    const isPriority = index === 0;
    const isFileVideo = !!it.videoUrl && !it.thumbnail && !/youtube|youtu\.be|vimeo|mediadelivery/i.test(it.videoUrl);
    const isImmobilier = (it.label || "").trim().toLowerCase() === "immobilier";
    const showImmoBadge = isImmobilier && (it.price || it.priceType);
    const isManualJsonCard = slot.kind === "extra";
    const priceTypeLabel = it.priceType
      ? it.priceType.toLowerCase() === "location"
        ? "Location"
        : it.priceType.toLowerCase() === "vente"
          ? "Vente"
          : it.priceType
      : null;
    const immoBadge = null;
    const optimizedThumb = optimizeSupabaseImage(it.thumbnail, isPriority ? { width: 240, quality: 50 } : { width: 400 });

    if (!it.videoId) {
      return (
        <div className="relative aspect-[9/16] rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground text-center px-2">
          {it.thumbnail ? (
            <>
              <img src={optimizedThumb || it.thumbnail} alt={it.businessName || it.label || ""} className="absolute inset-0 w-full h-full object-cover" loading={isPriority ? "eager" : "lazy"} fetchPriority={isPriority ? "high" : "auto"} decoding={isPriority ? "sync" : "async"} />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
            </>
          ) : (
            <span>{it.label || "Aucune vidéo"}</span>
          )}
          {it.label && (
            <div className="absolute inset-x-0 top-[10%] z-[8] flex items-center justify-center px-2">
              <button
                type="button"
                onClick={() => handleLabelActivate(slot)}
                className="px-2.5 py-1 rounded-md bg-white text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-white/90 transition-colors"
              >
                {it.label}
              </button>
            </div>
          )}
          {immoBadge}
        </div>
      );
    }

    return (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group w-full">
        <button
          type="button"
          onClick={() => {
            if (isDirectBusinessCard(slot)) {
              handleLabelActivate(slot);
            } else if (it.label && labelTakesPriority) {
              handleLabelActivate(slot);
            } else {
              setCurrentTime(0);
              setActiveIndex(index);
            }
          }}
          className="absolute inset-0 w-full h-full text-left cursor-pointer"
          aria-label={it.label ? `Filtrer ${it.label}` : `Lire ${it.businessName || ""}`}
        >
          {it.thumbnail ? (
            <img src={optimizedThumb || it.thumbnail} alt={it.businessName || ""} className="w-full h-full object-cover" loading={isPriority ? "eager" : "lazy"} fetchPriority={isPriority ? "high" : "auto"} decoding={isPriority ? "sync" : "async"} />
          ) : isFileVideo && it.videoUrl ? (
            <VideoThumbnail src={it.videoUrl} alt={it.businessName || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
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
              className="px-2.5 py-1 rounded-md bg-white text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-white/90 transition-colors"
            >
              {it.label}
            </button>
          </div>
        )}
        {immoBadge}
      </div>
    );
  };

  return (
    <div>
      <div className={`grid gap-4 ${activeSlot ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-6"}`}>
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
        description={activeDescription}
        agendaCity={
          activeSlot && (activeSlot.data.label || "").trim().toLowerCase() === "agenda"
            ? city
            : null
        }
        eventId={activeSlot?.data.eventId ?? null}
      />
    </div>
  );
};

export default HomepageCardsFront;
