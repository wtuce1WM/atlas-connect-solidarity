import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, formatRating } from "@/lib/ratingUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import ClubAuthPanel from "@/components/club/ClubAuthPanel";
import ClubBlueAuthPopup, { clubPopupTranslations } from "@/components/club/ClubBlueAuthPopup";

const clubTranslations = clubPopupTranslations;

interface TimelineItem {
  id: string;
  kind: "business" | "destination";
  name: string;
  hook: string | null;
  ratingOn20: number | null;
  start_time: number | null;
  end_time: number | null;
  sort_order: number;
}

interface Props {
  genericVideoId: string;
  currentTime: number;
}

const GenericVideoTimelineOverlay = ({ genericVideoId, currentTime }: Props) => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [clubOpen, setClubOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [showAuth, setShowAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const { language } = useLanguage();
  const t = clubTranslations[language] || clubTranslations.fr;
  const isLoggedIn = !!userId;

  // Auth tracking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Note: this overlay no longer listens to "open-generic-club-popup".
  // That global event is handled by ClubLoginPopup to avoid showing two
  // identical popups when the Profil CTA is clicked.
  // Le popup « Sauvegardez vos coups de cœur » est désormais ouvert par
  // l'icône Bookmark du header du viewer (le CTA texte a été supprimé).
  useEffect(() => {
    const onOpen = () => setClubOpen(true);
    window.addEventListener("open-video-timeline-club", onOpen as EventListener);
    return () => window.removeEventListener("open-video-timeline-club", onOpen as EventListener);
  }, []);

  // Notifie le viewer hôte (chips badges…) pour qu'elles s'effacent pendant
  // l'affichage du popup bleu — même rôle que "club-popup-state" du ClubLoginPopup.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("video-timeline-club-state", { detail: { open: clubOpen } }));
    return () => {
      window.dispatchEvent(new CustomEvent("video-timeline-club-state", { detail: { open: false } }));
    };
  }, [clubOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: poiLinks }, { data: bizLinks }, { data: destLinks }] = await Promise.all([
        supabase
          .from("generic_video_pois" as any)
          .select("poi_id, sort_order, start_time, end_time, timeframe_enabled")
          .eq("generic_video_id", genericVideoId)
          .eq("timeframe_enabled", true) as any,
        supabase
          .from("generic_video_businesses" as any)
          .select("business_id, sort_order, start_time, end_time, timeframe_enabled")
          .eq("generic_video_id", genericVideoId)
          .eq("timeframe_enabled", true) as any,
        supabase
          .from("generic_video_destinations" as any)
          .select("destination_id, sort_order, start_time, end_time, timeframe_enabled")
          .eq("generic_video_id", genericVideoId)
          .eq("timeframe_enabled", true) as any,
      ]);

      const ids = [
        ...((poiLinks || []).map((l: any) => l.poi_id)),
        ...((bizLinks || []).map((l: any) => l.business_id)),
      ];
      const destIds = (destLinks || []).map((l: any) => l.destination_id);
      if (ids.length === 0 && destIds.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      const [{ data: bizs }, { data: dests }] = await Promise.all([
        ids.length
          ? supabase
              .from("businesses")
              .select(
                "id, name, hook_fr, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count"
              )
              .in("id", ids)
          : Promise.resolve({ data: [] as any[] }),
        destIds.length
          ? (supabase
              .from("destinations" as any)
              .select("id, name_fr, hook_fr")
              .in("id", destIds) as any)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const map = new Map<string, any>();
      (bizs || []).forEach((b: any) => map.set(b.id, b));
      const destMap = new Map<string, any>();
      ((dests || []) as any[]).forEach((d: any) => destMap.set(d.id, d));

      const built: TimelineItem[] = [];
      (poiLinks || []).forEach((l: any) => {
        const b = map.get(l.poi_id);
        if (!b) return;
        built.push({
          id: l.poi_id,
          kind: "business",
          name: b.name,
          hook: b.hook_fr ?? null,
          ratingOn20: computeWeightedRatingOn20(collectRatingSources(b)),
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      (bizLinks || []).forEach((l: any) => {
        const b = map.get(l.business_id);
        if (!b) return;
        built.push({
          id: l.business_id,
          kind: "business",
          name: b.name,
          hook: b.hook_fr ?? null,
          ratingOn20: computeWeightedRatingOn20(collectRatingSources(b)),
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      (destLinks || []).forEach((l: any) => {
        const d = destMap.get(l.destination_id);
        if (!d) return;
        built.push({
          id: l.destination_id,
          kind: "destination",
          name: d.name_fr,
          hook: d.hook_fr ?? null,
          ratingOn20: null,
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      built.sort((a, b) => a.sort_order - b.sort_order);
      // Dédoublonnage : un même établissement peut être lié à la fois en POI
      // et en business — on ne garde que la première occurrence (POI prioritaire).
      // On n'affiche que les liaisons réellement placées sur une timeframe.
      const seen = new Set<string>();
      const deduped = built.filter((it) => {
        if (it.start_time == null) return false;
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
      if (!cancelled) setItems(deduped);

    };
    load();
    return () => {
      cancelled = true;
    };
  }, [genericVideoId]);

  // Load bookmarks for logged-in user when popup opens
  useEffect(() => {
    if (!clubOpen || !userId || items.length === 0) return;
    const loadBookmarks = async () => {
      const { data } = await supabase
        .from("bookmarks" as any)
        .select("business_id")
        .eq("user_id", userId)
        .in("business_id", items.filter((i) => i.kind === "business").map((i) => i.id));
      const set = new Set<string>((data || []).map((d: any) => d.business_id));
      setBookmarkedIds(set);
    };
    loadBookmarks();
  }, [clubOpen, userId, items]);

  const reachedItems = useMemo(
    () => items.filter((it) => (it.start_time ?? 0) <= currentTime),
    [items, currentTime]
  );

  // Signale au header (icône Like/coeur) chaque nouvelle entrée affichée.
  const prevReachedRef = useRef(0);
  useEffect(() => {
    if (reachedItems.length > prevReachedRef.current) {
      window.dispatchEvent(
        new CustomEvent("video-timeline-entry", { detail: { count: reachedItems.length } })
      );
    }
    prevReachedRef.current = reachedItems.length;
  }, [reachedItems.length]);


  // Track whether the video has completed at least one full play.
  // Detect a loop by spotting a backwards jump in currentTime (end → ~0).
  const [hasCompletedOnce, setHasCompletedOnce] = useState(false);
  const prevTimeRef = useRef(0);
  useEffect(() => {
    if (currentTime + 1 < prevTimeRef.current) {
      setHasCompletedOnce(true);
    }
    prevTimeRef.current = currentTime;
  }, [currentTime]);

  // Items shown inside the Club popup: all items once the video has played
  // through once, otherwise only those reached so far.
  // Les destinations ne sont pas sauvegardables en favoris (bookmarks = business).
  const popupItems = (hasCompletedOnce ? items : reachedItems).filter(
    (it) => it.kind === "business"
  );

  const activeId = useMemo(() => {
    if (reachedItems.length === 0) return null;
    const within = [...reachedItems].reverse().find((it) => {
      const end = it.end_time ?? Infinity;
      return currentTime < end;
    });
    return (within || reachedItems[reachedItems.length - 1]).id;
  }, [reachedItems, currentTime]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const [rowOffset, setRowOffset] = useState(0);
  useEffect(() => {
    const container = scrollRef.current;
    const el = activeRef.current;
    if (!container || !el) return;
    const raf = requestAnimationFrame(() => {
      const offset = (container.clientWidth / 2) - (el.offsetLeft + el.offsetWidth / 2);
      setRowOffset(offset);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeId, reachedItems.length]);

  const showClubButton = currentTime >= 10;

  const toggleBookmark = async (itemId: string) => {
    if (!userId) return;
    setSavingId(itemId);
    try {
      const isSaved = bookmarkedIds.has(itemId);
      if (isSaved) {
        await supabase
          .from("bookmarks" as any)
          .delete()
          .eq("user_id", userId)
          .eq("business_id", itemId);
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        await supabase
          .from("bookmarks" as any)
          .insert({ user_id: userId, business_id: itemId } as any);
        setBookmarkedIds((prev) => new Set(prev).add(itemId));
        toast({ description: t.toastSaved });
      }
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    if (!userId) return;
    const toSave = popupItems.filter((it) => !bookmarkedIds.has(it.id));
    if (toSave.length === 0) return;
    setSavingAll(true);
    try {
      await supabase
        .from("bookmarks" as any)
        .insert(toSave.map((it) => ({ user_id: userId, business_id: it.id })) as any);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        toSave.forEach((it) => next.add(it.id));
        return next;
      });
      toast({ description: t.toastAllSaved });
    } finally {
      setSavingAll(false);
    }
  };

  const unsavedCount = popupItems.filter((it) => !bookmarkedIds.has(it.id)).length;

  if (reachedItems.length === 0 && !showClubButton && !clubOpen) return null;

  return (
    <>
      {reachedItems.length > 0 && (
        <div
          ref={scrollRef}
          className="absolute top-[22%] left-0 right-0 z-20 overflow-hidden pb-1"
        >
          <div
            className="flex flex-row gap-2 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${rowOffset}px)` }}
          >
            {reachedItems.map((it) => {
              const isActive = it.id === activeId;
              return (
                <div
                  key={it.id}
                  ref={isActive ? activeRef : undefined}
                  className={`shrink-0 w-[240px] rounded-md bg-black/65 backdrop-blur-sm px-3 py-2 text-white shadow-lg animate-in fade-in duration-300 transition-colors ${
                    isActive ? "border-2 border-gold" : "border border-white/10"
                  }`}
                >
                  <p className="text-sm font-semibold leading-tight break-words">{it.name}</p>
                  {it.ratingOn20 != null && (
                    <p className="text-xs font-bold text-gold mt-1">
                      {formatRating(it.ratingOn20)}/20
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {clubOpen && (
        <ClubBlueAuthPopup onClose={() => setClubOpen(false)}>
            {!isLoggedIn ? (
              <div className="p-3 sm:p-6 text-stone-900 bg-transparent">
                <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 !font-sans text-stone-900 text-center">
                  {t.memberTitle}
                </h3>
                <p className="text-stone-700 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-5 text-center">{t.memberDesc}</p>
                <ClubAuthPanel redirectPath={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"} />
              </div>
            ) : (
              <div className="p-6 text-stone-900 bg-transparent">
                <h3 className="text-lg font-semibold mb-1 !font-sans text-stone-900 text-center">
                  {t.saveTitle}
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed mb-4 text-center">
                  {t.saveDesc}
                </p>

                {popupItems.length === 0 ? (
                  <p className="text-center text-sm text-stone-600 py-6">{t.noItems}</p>
                ) : (
                  <>
                    <style>{`
                      .club-scroll::-webkit-scrollbar { width: 6px; }
                      .club-scroll::-webkit-scrollbar-track { background: transparent; }
                      .club-scroll::-webkit-scrollbar-thumb { background: #194CFF; border-radius: 9999px; }
                      .club-scroll::-webkit-scrollbar-thumb:hover { background: #1244e6; }
                      .club-scroll { scrollbar-width: thin; scrollbar-color: #194CFF transparent; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
                      .club-scroll-mask { -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%); mask-image: linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%); }
                    `}</style>
                    <div className="club-scroll club-scroll-mask max-h-[40vh] overflow-y-auto space-y-2 mb-4 pr-2 py-2">
                      {popupItems.map((it) => {
                        const isSaved = bookmarkedIds.has(it.id);
                        const isSaving = savingId === it.id;
                        return (
                          <div
                            key={it.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-stone-900 truncate">
                                {it.name}
                              </p>
                              {it.ratingOn20 != null && (
                                <p className="text-xs font-bold text-amber-800">
                                  {formatRating(it.ratingOn20)}/20
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(it.id)}
                              disabled={isSaving}
                              className="h-9 w-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
                              style={{ backgroundColor: isSaved ? "#194CFF" : "transparent", border: isSaved ? "none" : "1.5px solid #194CFF" }}
                              aria-label={isSaved ? t.saved : t.saveBtn}
                            >
                              {isSaved ? (
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                              ) : (
                                <Heart className="h-4 w-4" style={{ color: "#194CFF" }} strokeWidth={2.5} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {unsavedCount > 0 && (
                      <button
                        type="button"
                        onClick={saveAll}
                        disabled={savingAll}
                        style={{ backgroundColor: "#25D366" }}
                        className="w-full rounded-full px-6 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md disabled:opacity-50"
                      >
                        {t.saveAll} ({unsavedCount})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
        </ClubBlueAuthPopup>
      )}
    </>
  );
};

export default GenericVideoTimelineOverlay;
