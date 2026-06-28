import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plane, Plus, Calendar, MapPin, ArrowRight } from "lucide-react";

interface TripPreview {
  id: string;
  title: string;
  arrival_date: string | null;
  departure_date: string | null;
  business_count: number;
}

const ClubTripsPreview = ({ userId }: { userId: string }) => {
  const { language } = useLanguage();
  const [trips, setTrips] = useState<TripPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (fr: string, en: string, ar: string) =>
    language === "en" ? en : language === "ar" ? ar : fr;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("club_trips")
        .select("id, title, arrival_date, departure_date, club_trip_businesses(business_id)")
        .eq("user_id", userId)
        .order("arrival_date", { ascending: true, nullsFirst: false })
        .limit(6);
      if (cancelled) return;
      setTrips(
        ((data || []) as any[]).map((r) => ({
          id: r.id,
          title: r.title,
          arrival_date: r.arrival_date,
          departure_date: r.departure_date,
          business_count: r.club_trip_businesses?.length || 0,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const goToTrips = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "travel");
    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(
          language === "en" ? "en-GB" : language === "ar" ? "ar-MA" : "fr-FR",
          { day: "2-digit", month: "short" }
        )
      : null;

  if (loading) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#C04F17]/90 to-[#8a3811]/90 p-4 sm:p-5 shadow-lg border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-white">
          <Plane className="w-5 h-5" />
          <h3 className="font-semibold text-base">
            {t("Mes voyages", "My trips", "رحلاتي")}
          </h3>
          {trips.length > 0 && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
              {trips.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={goToTrips}
          className="inline-flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white"
        >
          {t("Tout voir", "See all", "عرض الكل")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {trips.length === 0 ? (
        <button
          type="button"
          onClick={goToTrips}
          className="w-full rounded-xl border border-dashed border-white/40 bg-white/10 hover:bg-white/15 transition-colors p-5 text-center"
        >
          <Plus className="w-6 h-6 text-white mx-auto mb-2" />
          <p className="text-white text-sm font-semibold">
            {t(
              "Créez votre premier voyage",
              "Create your first trip",
              "أنشئ رحلتك الأولى"
            )}
          </p>
          <p className="text-white/80 text-xs mt-1">
            {t(
              "Planifiez vos dates et regroupez vos lieux préférés.",
              "Plan your dates and group your favorite places.",
              "خطط لرحلتك واجمع أماكنك المفضلة."
            )}
          </p>
        </button>
      ) : (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
          {trips.map((trip) => {
            const arr = fmtDate(trip.arrival_date);
            const dep = fmtDate(trip.departure_date);
            return (
              <button
                key={trip.id}
                type="button"
                onClick={goToTrips}
                className="snap-start shrink-0 w-44 text-left rounded-xl bg-[#ECD6B8] hover:bg-white text-[#0a1d4a] p-3 transition-colors shadow-sm"
              >
                <div className="font-semibold text-sm truncate">{trip.title}</div>
                {(arr || dep) && (
                  <div className="flex items-center gap-1 text-[11px] mt-1.5 opacity-80">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {arr || "—"} → {dep || "—"}
                    </span>
                  </div>
                )}
                {trip.business_count > 0 && (
                  <div className="flex items-center gap-1 text-[11px] mt-1 opacity-80">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {trip.business_count}{" "}
                      {trip.business_count > 1
                        ? t("lieux", "places", "أماكن")
                        : t("lieu", "place", "مكان")}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={goToTrips}
            className="snap-start shrink-0 w-32 rounded-xl border border-dashed border-white/40 bg-white/5 hover:bg-white/15 text-white p-3 flex flex-col items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">
              {t("Nouveau voyage", "New trip", "رحلة جديدة")}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ClubTripsPreview;
