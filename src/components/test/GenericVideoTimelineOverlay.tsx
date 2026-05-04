import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Heart, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, formatRating } from "@/lib/ratingUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import ClubAuthForm from "@/components/club/ClubAuthForm";

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: poiLinks }, { data: bizLinks }] = await Promise.all([
        supabase
          .from("generic_video_pois" as any)
          .select("poi_id, sort_order, start_time, end_time")
          .eq("generic_video_id", genericVideoId) as any,
        supabase
          .from("generic_video_businesses" as any)
          .select("business_id, sort_order, start_time, end_time")
          .eq("generic_video_id", genericVideoId) as any,
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
      if (!cancelled) setItems(built);
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
    const toSave = reachedItems.filter((it) => !bookmarkedIds.has(it.id));
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

  const unsavedCount = reachedItems.filter((it) => !bookmarkedIds.has(it.id)).length;

  if (reachedItems.length === 0 && !showClubButton) return null;

  return (
    <>
      {reachedItems.length > 0 && (
        <div
          ref={scrollRef}
          className="absolute top-3 left-0 right-0 z-20 overflow-hidden pb-1"
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
          style={{ backgroundColor: "#6050DC" }}
          className="absolute top-[138px] md:top-[133px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full px-3 py-1 text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 hover:opacity-90 transition-opacity"
        >
          <Heart className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">
            {t.saveBtn}
          </span>
          {isLoggedIn && unsavedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[10px] font-bold" style={{ color: "#6050DC" }}>
              {unsavedCount}
            </span>
          )}
        </button>
      )}
      {clubOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setClubOpen(false)}
        >
          <div
            className="w-[90%] max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ backgroundColor: "#6050DC" }} className="p-6 text-white relative">
              <button
                type="button"
                onClick={() => setClubOpen(false)}
                className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-sm opacity-90">{t.welcome}</p>
              <h2 className="text-2xl font-bold mt-1 !font-sans !not-italic">{t.clubName}</h2>
            </div>

            {!isLoggedIn ? (
              <div className="bg-card p-6">
                {!showAuth ? (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-card-foreground mb-3 !font-sans">
                      {t.memberTitle}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6">{t.memberDesc}</p>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
                      style={{ backgroundColor: "#6050DC" }}
                      className="inline-block rounded-full px-8 py-3 text-white font-semibold text-sm hover:opacity-90 transition-colors shadow-md"
                    >
                      {t.joinBtn}
                    </button>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t.alreadyMember}{" "}
                      <button
                        type="button"
                        onClick={() => { setAuthMode("login"); setShowAuth(true); }}
                        style={{ color: "#6050DC" }}
                        className="font-medium hover:underline bg-transparent"
                      >
                        {t.login}
                      </button>
                    </p>
                  </div>
                ) : (
                  <ClubAuthForm
                    defaultMode={authMode}
                    onSuccess={() => setShowAuth(false)}
                  />
                )}
              </div>
            ) : (
              <div className="bg-card p-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-1 !font-sans text-center">
                  {t.saveTitle}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4 text-center">
                  {t.saveDesc}
                </p>

                {reachedItems.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">{t.noItems}</p>
                ) : (
                  <>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 mb-4 pr-1">
                      {reachedItems.map((it) => {
                        const isSaved = bookmarkedIds.has(it.id);
                        const isSaving = savingId === it.id;
                        return (
                          <div
                            key={it.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-card-foreground truncate">
                                {it.name}
                              </p>
                              {it.ratingOn20 != null && (
                                <p className="text-xs font-bold text-gold">
                                  {formatRating(it.ratingOn20)}/20
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(it.id)}
                              disabled={isSaving}
                              className="h-9 w-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
                              style={{ backgroundColor: isSaved ? "#6050DC" : "transparent", border: isSaved ? "none" : "1.5px solid #6050DC" }}
                              aria-label={isSaved ? t.saved : t.saveBtn}
                            >
                              {isSaved ? (
                                <Check className="h-4 w-4 text-white" strokeWidth={3} />
                              ) : (
                                <Heart className="h-4 w-4" style={{ color: "#6050DC" }} strokeWidth={2.5} />
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
                        style={{ backgroundColor: "#6050DC" }}
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
