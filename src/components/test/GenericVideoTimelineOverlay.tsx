import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { collectRatingSources, computeWeightedRatingOn20, formatRating } from "@/lib/ratingUtils";
import { useLanguage } from "@/contexts/LanguageContext";

const clubTranslations = {
  fr: {
    club: "Le Club",
    welcome: "Bienvenue dans",
    clubName: "le Club OWM",
    memberTitle: "Devenir membre",
    memberDesc: "Découvrez de nouvelles manières de profiter du meilleur du Maroc et accédez à des avantages exclusifs.",
    joinBtn: "Je m'inscris",
    alreadyMember: "Vous avez déjà un compte ?",
    login: "Connectez-vous",
  },
  en: {
    club: "The Club",
    welcome: "Welcome to",
    clubName: "the OWM Club",
    memberTitle: "Become a member",
    memberDesc: "Discover new ways to enjoy the best of Morocco and access exclusive benefits.",
    joinBtn: "Join now",
    alreadyMember: "Already have an account?",
    login: "Log in",
  },
  ar: {
    club: "النادي",
    welcome: "مرحباً بكم في",
    clubName: "نادي OWM",
    memberTitle: "كن عضواً",
    memberDesc: "اكتشف طرقاً جديدة للاستمتاع بأفضل ما في المغرب والحصول على مزايا حصرية.",
    joinBtn: "سجّل الآن",
    alreadyMember: "لديك حساب بالفعل؟",
    login: "سجّل الدخول",
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

  // All items whose start_time has been reached (cumulative)
  const reachedItems = useMemo(
    () => items.filter((it) => (it.start_time ?? 0) <= currentTime),
    [items, currentTime]
  );

  // Active = the latest reached item still within its end_time window (or last reached)
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

  // Auto-scroll active item into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeId]);

  const showClubButton = currentTime >= 10;

  if (reachedItems.length === 0 && !showClubButton) return null;

  return (
    <>
      {reachedItems.length > 0 && (
        <div
          ref={scrollRef}
          className="absolute top-3 left-3 right-3 z-20 flex flex-row gap-2 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {reachedItems.map((it) => {
            const isActive = it.id === activeId;
            return (
              <div
                key={it.id}
                ref={isActive ? activeRef : undefined}
                className={`shrink-0 w-[33%] min-w-[180px] rounded-md bg-black/65 backdrop-blur-sm px-3 py-2 text-white shadow-lg animate-in fade-in slide-in-from-left-2 duration-300 transition-colors ${
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
      )}
      {showClubButton && (
        <Link
          to="/club"
          style={{ backgroundColor: "#6050DC" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-2 rounded-full px-6 py-3 text-white shadow-2xl animate-in fade-in zoom-in-50 duration-500 hover:opacity-90 hover:scale-105 transition-all"
        >
          <Crown className="h-5 w-5" />
          <span className="font-semibold text-sm tracking-wide">LE CLUB</span>
        </Link>
      )}
    </>
  );
};

export default GenericVideoTimelineOverlay;
