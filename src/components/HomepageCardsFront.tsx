import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star } from "lucide-react";
import VideoThumbnail from "@/components/VideoThumbnail";
import { optimizeSupabaseImage } from "@/lib/imageOptimization";
import { getCached, setCached } from "@/lib/swrCache";
import { translateVignetteLabel } from "@/lib/vignetteLabels";
import { useLanguage } from "@/contexts/LanguageContext";

// Heavy player/overlay — never visible at first paint. Code-split out of the initial bundle.
const BookOnlineSlidePanel = lazy(() => import("@/components/BookOnlineSlidePanel"));

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
  const navigate = useLocalizedNavigate();
  const cacheKey = `home:cards:${city}`;
  const { language } = useLanguage();
  const tr = (l: string | null | undefined) => translateVignetteLabel(l, language);
  const cachedInitial = getCached<MixedSlot[]>(cacheKey);
  // Persist last city so index.html can early-prime on next visit.
  try { localStorage.setItem("oneworld:lastHomepageCity", city); } catch {}
  const [slots, setSlots] = useState<MixedSlot[]>(cachedInitial || []);
  const [loading, setLoading] = useState(!cachedInitial);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeDescription, setActiveDescription] = useState<string | null>(null);
  const isFirstLoad = useRef(!cachedInitial);

  useEffect(() => {
    let cancelled = false;
    const apply = (payload: MixedSlot[]) => {
      if (cancelled) return;
      setSlots(payload);
      setCached(cacheKey, payload);
      setLoading(false);
      isFirstLoad.current = false;
    };

    // Fast path: snapshot already fetched by index.html early-prime script.
    const earlyCity = (window as any).__HOME_SNAPSHOT_CITY__;
    const earlyPromise = (window as any).__HOME_SNAPSHOT__;
    if (earlyPromise && earlyCity === city) {
      Promise.resolve(earlyPromise).then((payload: MixedSlot[] | null) => {
        if (cancelled) return;
        if (payload) {
          apply(payload);
        } else {
          // Early-prime returned nothing → fall back to a normal query.
          loadFromDb();
        }
      });
      return () => { cancelled = true; };
    }

    const loadFromDb = async () => {
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
      apply(((data?.payload as MixedSlot[] | null) || []));
    };
    loadFromDb();
    return () => { cancelled = true; };
  }, [city]);

  // Note: LCP image priority is handled inline via fetchPriority="high" on the first <img>.
  // No dynamic <link rel="preload"> here — it competed with the JS bundle for bandwidth
  // and degraded FCP on mobile.

  // #3 Preload the BookOnlineSlidePanel chunk after the homepage is idle, so the first
  // click on a card opens instantly (chunk already in cache, no network round-trip).
  useEffect(() => {
    const ric: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1500));
    const handle = ric(() => { import("@/components/BookOnlineSlidePanel").catch(() => {}); });
    return () => {
      const cic: any = (window as any).cancelIdleCallback;
      if (cic && typeof handle === "number") cic(handle);
    };
  }, []);

  // Playable slots only (have a video)
  const playableIndices = slots
    .map((s, i) => (s.data.videoId ? i : -1))
    .filter((i) => i >= 0);

  const activeSlot = activeIndex !== null ? slots[activeIndex] : null;
  const activePosInPlayable = activeIndex !== null ? playableIndices.indexOf(activeIndex) : -1;
  const hasPrev = activePosInPlayable > 0;
  const hasNext = activePosInPlayable >= 0 && activePosInPlayable < playableIndices.length - 1;

  // Fetch description of the active business so the green "+" overlay can render in BookOnlineSlidePanel.
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
  // business slide panel on the Search page (same as "En savoir +" CTA in BookOnlineSlidePanel).
  // Regular video cards (kind === "entry") must keep their normal video-player behavior.
  const isDirectBusinessCard = (slot: MixedSlot) => {
    const d = slot.data;
    return slot.kind === "extra" && !!d.ownerId && !d.badgeId && !d.eventId && !d.target;
  };

  const handleLabelActivate = (slot: MixedSlot) => {
    if (isDirectBusinessCard(slot) && slot.data.ownerId) {
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
    // LCP image: smaller width (mobile-first) + low quality. Other vignettes: 400px.
    const optimizedThumb = optimizeSupabaseImage(it.thumbnail, isPriority ? { width: 200, quality: 45 } : { width: 400 });
    // #8 Retina srcset: serve a 2x variant for high-DPI screens, original (1x) for mobile.
    const thumb2x = isPriority
      ? optimizeSupabaseImage(it.thumbnail, { width: 400, quality: 55 })
      : optimizeSupabaseImage(it.thumbnail, { width: 800 });
    const thumbSrcSet = optimizedThumb && thumb2x && thumb2x !== optimizedThumb
      ? `${optimizedThumb} 1x, ${thumb2x} 2x`
      : undefined;
    // #6 content-visibility: skip layout/paint for off-screen cards. Keep the first
    // row (6 cards on lg) eagerly rendered so LCP isn't delayed.
    const cvStyle: React.CSSProperties | undefined = index >= 6
      ? { contentVisibility: "auto", containIntrinsicSize: "auto 360px" } as React.CSSProperties
      : undefined;

    if (!it.videoId) {
      return (
        <div className="relative aspect-[9/16] rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xs text-muted-foreground text-center px-2 group" style={cvStyle}>
          {it.thumbnail ? (
            <>
              <img src={optimizedThumb || it.thumbnail} srcSet={thumbSrcSet} alt={it.businessName || it.label || ""} className="absolute inset-0 w-full h-full object-cover" loading={isPriority ? "eager" : "lazy"} fetchPriority={isPriority ? "high" : "auto"} decoding={isPriority ? "sync" : "async"} />
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
            </>
          ) : (
            <span>{tr(it.label) || "Aucune vidéo"}</span>
          )}
          {it.label && (
            <div className="absolute inset-x-0 top-[10%] z-[8] flex items-center justify-center px-2">
              <button
                type="button"
                onClick={() => handleLabelActivate(slot)}
                className="px-2.5 py-1 rounded-md bg-white text-black text-xs font-bold uppercase tracking-wide text-center line-clamp-2 shadow-lg border-2 border-black cursor-pointer hover:bg-white/90 transition-colors"
              >
                {tr(it.label)}
              </button>
            </div>
          )}
          {immoBadge}
        </div>
      );
    }

    return (
      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted group w-full" style={cvStyle}>
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
          aria-label={it.label ? `Filtrer ${tr(it.label)}` : `Lire ${it.businessName || ""}`}
        >
          {it.thumbnail ? (
            <img src={optimizedThumb || it.thumbnail} srcSet={thumbSrcSet} alt={it.businessName || ""} className="w-full h-full object-cover" loading={isPriority ? "eager" : "lazy"} fetchPriority={isPriority ? "high" : "auto"} decoding={isPriority ? "sync" : "async"} />
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
              {tr(it.label)}
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

      {activeSlot && (
        <Suspense fallback={null}>
          <BookOnlineSlidePanel
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
        </Suspense>
      )}
    </div>
  );
};

export default HomepageCardsFront;
