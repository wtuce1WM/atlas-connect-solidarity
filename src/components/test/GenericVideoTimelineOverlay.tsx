import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Heart, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, formatRating } from "@/lib/ratingUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import ClubAuthPanel from "@/components/club/ClubAuthPanel";

const clubTranslations = {
  fr: {
    club: "Le Club",
    welcome: "Bienvenue dans",
    clubName: "le Club OWM",
    memberTitle: "Sauvegardez vos coups de cœur",
    memberDesc: "Connectez-vous au Club OWM pour sauvegarder les lieux découverts dans cette vidéo et y revenir à tout moment.",
    joinBtn: "Je m'inscris",
    alreadyMember: "Vous avez déjà un compte ?",
    login: "Connectez-vous",
    saveTitle: "Sauvegarder mes coups de cœur",
    saveDesc: "Ajoutez les lieux de cette vidéo à vos favoris.",
    saveAll: "Tout sauvegarder",
    saved: "Sauvegardé",
    noItems: "Aucun lieu à sauvegarder pour le moment.",
    saveBtn: "SAUVEGARDER",
    clubBtn: "LE CLUB",
    toastSaved: "Ajouté à vos favoris",
    toastAllSaved: "Tous les lieux ont été sauvegardés",
  },
  en: {
    club: "The Club",
    welcome: "Welcome to",
    clubName: "the OWM Club",
    memberTitle: "Save your favorites",
    memberDesc: "Sign in to the OWM Club to save the places you discover in this video and revisit them anytime.",
    joinBtn: "Join now",
    alreadyMember: "Already have an account?",
    login: "Log in",
    saveTitle: "Save your favorites",
    saveDesc: "Add the places from this video to your favorites.",
    saveAll: "Save all",
    saved: "Saved",
    noItems: "No places to save yet.",
    saveBtn: "SAVE",
    clubBtn: "THE CLUB",
    toastSaved: "Added to your favorites",
    toastAllSaved: "All places have been saved",
  },
  ar: {
    club: "النادي",
    welcome: "مرحباً بكم في",
    clubName: "نادي OWM",
    memberTitle: "احفظ أماكنك المفضلة",
    memberDesc: "سجّل الدخول إلى نادي OWM لحفظ الأماكن التي تكتشفها في هذا الفيديو والعودة إليها في أي وقت.",
    joinBtn: "سجّل الآن",
    alreadyMember: "لديك حساب بالفعل؟",
    login: "سجّل الدخول",
    saveTitle: "احفظ أماكنك المفضلة",
    saveDesc: "أضف أماكن هذا الفيديو إلى مفضلتك.",
    saveAll: "احفظ الكل",
    saved: "تم الحفظ",
    noItems: "لا توجد أماكن للحفظ بعد.",
    saveBtn: "احفظ",
    clubBtn: "النادي",
    toastSaved: "تمت الإضافة إلى مفضلتك",
    toastAllSaved: "تم حفظ جميع الأماكن",
  },
} as const;

interface TimelineItem {
  id: string;
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: poiLinks }, { data: bizLinks }] = await Promise.all([
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
      ]);

      const ids = [
        ...((poiLinks || []).map((l: any) => l.poi_id)),
        ...((bizLinks || []).map((l: any) => l.business_id)),
      ];
      if (ids.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      const { data: bizs } = await supabase
        .from("businesses")
        .select(
          "id, name, hook_fr, google_rating, google_review_count, tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating, restaurant_guru_review_count, getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count, avis_verifies_rating, avis_verifies_review_count, trustpilot_rating, trustpilot_review_count, kayak_rating, kayak_review_count, tourradar_rating, tourradar_review_count"
        )
        .in("id", ids);

      const map = new Map<string, any>();
      (bizs || []).forEach((b: any) => map.set(b.id, b));

      const built: TimelineItem[] = [];
      (poiLinks || []).forEach((l: any) => {
        const b = map.get(l.poi_id);
        if (!b) return;
        built.push({
          id: l.poi_id,
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
          name: b.name,
          hook: b.hook_fr ?? null,
          ratingOn20: computeWeightedRatingOn20(collectRatingSources(b)),
          start_time: l.start_time,
          end_time: l.end_time,
          sort_order: l.sort_order ?? 0,
        });
      });
      built.sort((a, b) => a.sort_order - b.sort_order);
      // Dédoublonnage : un même établissement peut être lié à la fois en POI
      // et en business — on ne garde que la première occurrence (POI prioritaire).
      const seen = new Set<string>();
      const deduped = built.filter((it) => {
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
        .in("business_id", items.map((i) => i.id));
      const set = new Set<string>((data || []).map((d: any) => d.business_id));
      setBookmarkedIds(set);
    };
    loadBookmarks();
  }, [clubOpen, userId, items]);

  const reachedItems = useMemo(
    () => items.filter((it) => (it.start_time ?? 0) <= currentTime),
    [items, currentTime]
  );

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
  const popupItems = hasCompletedOnce ? items : reachedItems;

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
                  {it.hook && (
                    <p className="text-[11px] text-white/85 leading-snug mt-0.5 break-words">
                      {it.hook}
                    </p>
                  )}
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
      {reachedItems.length > 0 && (
        <button
          type="button"
          onClick={() => setClubOpen(true)}
          style={{ backgroundColor: "#194CFF" }}
          className="absolute top-[calc(22%+5rem)] md:top-[calc(22%+5rem)] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full px-3 py-1 text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 hover:opacity-90 transition-opacity"
        >
          <Heart className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">
            {t.saveBtn}
          </span>
          {isLoggedIn && unsavedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[10px] font-bold" style={{ color: "#194CFF" }}>
              {unsavedCount}
            </span>
          )}
        </button>
      )}
      {clubOpen && (
        <div
          className="absolute inset-0 z-[90] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setClubOpen(false)}
        >
          <div
            className="club-popup-body w-full max-w-md max-h-[calc(100dvh-12rem)] md:max-h-[calc(100dvh-14rem)] lg:max-h-none overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 sm:p-6 text-white relative bg-transparent">
              <button
                type="button"
                onClick={() => setClubOpen(false)}
                className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-xs sm:text-sm opacity-90">{t.welcome}</p>
              <h2 className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1 !font-sans !not-italic">{t.clubName}</h2>
            </div>

            <style>{`
              @keyframes clubShimmerOnce {
                0% { transform: translateX(-150%) skewX(-20deg); }
                100% { transform: translateX(300%) skewX(-20deg); }
              }
              .club-popup-body { position: relative; overflow: hidden; background: linear-gradient(to bottom, #194CFF 0%, #6E8FFF 12%, #BED1FF 32%, #BED1FF 100%); }
              .club-popup-body::before {
                content: "";
                position: absolute;
                top: 0; bottom: 0;
                width: 50%;
                left: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.1) 80%, transparent 100%);
                transform: translateX(-150%) skewX(-20deg);
                animation: clubShimmerOnce 0.8s cubic-bezier(0.25, 1, 0.5, 1) 0.45s 1 forwards;
                pointer-events: none;
                z-index: 0;
              }
              .club-popup-body > * { position: relative; z-index: 1; }
            `}</style>
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
          </div>
        </div>
      )}
    </>
  );
};

export default GenericVideoTimelineOverlay;
