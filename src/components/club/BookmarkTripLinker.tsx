import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plane, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  userId: string;
  businessId: string;
}

interface TripRow {
  id: string;
  title: string;
  arrival_date: string | null;
  departure_date: string | null;
  linked: boolean;
}

const BookmarkTripLinker = ({ userId, businessId }: Props) => {
  const { language } = useLanguage();
  const t = (fr: string, en: string, ar: string) => language === "en" ? en : language === "ar" ? ar : fr;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trips, setTrips] = useState<TripRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: tripsData } = await supabase
      .from("club_trips")
      .select("id, title, arrival_date, departure_date")
      .eq("user_id", userId)
      .order("arrival_date", { ascending: true, nullsFirst: false });
    const tripIds = (tripsData || []).map((t: any) => t.id);
    let linkedIds = new Set<string>();
    if (tripIds.length > 0) {
      const { data: links } = await supabase
        .from("club_trip_businesses")
        .select("trip_id")
        .eq("business_id", businessId)
        .in("trip_id", tripIds);
      linkedIds = new Set((links || []).map((l: any) => l.trip_id));
    }
    setTrips((tripsData || []).map((t: any) => ({ ...t, linked: linkedIds.has(t.id) })));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

  const toggle = (id: string) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, linked: !t.linked } : t));
  };

  const save = async () => {
    setSaving(true);
    // For each trip: if linked => upsert; else delete
    const toLink = trips.filter(t => t.linked).map(t => ({ trip_id: t.id, business_id: businessId }));
    const toUnlinkIds = trips.filter(t => !t.linked).map(t => t.id);
    if (toUnlinkIds.length > 0) {
      await supabase.from("club_trip_businesses")
        .delete()
        .eq("business_id", businessId)
        .in("trip_id", toUnlinkIds);
    }
    if (toLink.length > 0) {
      // upsert without duplicates
      await supabase.from("club_trip_businesses").upsert(toLink, { onConflict: "trip_id,business_id" });
    }
    setSaving(false);
    setOpen(false);
    toast({ title: t("Liaisons mises à jour", "Links updated", "تم التحديث") });
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString(language === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short" }) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-black hover:bg-black/10 hover:text-black" title={t("Lier à un voyage", "Link to a trip", "ربط برحلة")}>
          <Plane className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 bg-white text-black p-3 z-[60]">
        <div className="text-sm font-semibold mb-2">{t("Lier à un voyage", "Link to a trip", "ربط برحلة")}</div>
        {loading ? (
          <div className="text-xs text-black/60 py-2">{t("Chargement…", "Loading…", "…")}</div>
        ) : trips.length === 0 ? (
          <div className="text-xs text-black/60 py-2">
            {t("Aucun voyage. Créez-en un dans l'onglet Voyages.", "No trip yet. Create one in the Trips tab.", "لا توجد رحلات.")}
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {trips.map(tr => (
              <label key={tr.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-black/5 cursor-pointer">
                <Checkbox checked={tr.linked} onCheckedChange={() => toggle(tr.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{tr.title}</div>
                  {(tr.arrival_date || tr.departure_date) && (
                    <div className="text-[11px] text-black/60">{fmt(tr.arrival_date)} → {fmt(tr.departure_date)}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
        {trips.length > 0 && (
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={save} disabled={saving} className="bg-[#194CFF] hover:bg-[#1340d6] text-white h-8">
              <Check className="w-3.5 h-3.5 mr-1" />
              {saving ? t("…", "…", "…") : t("Valider", "Save", "حفظ")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default BookmarkTripLinker;
