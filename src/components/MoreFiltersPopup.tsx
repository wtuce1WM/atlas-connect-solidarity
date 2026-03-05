import { useState, useEffect } from "react";
import { Clock, Leaf, Package, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const TIME_SLOT_OPTIONS = [
  { value: "matinee", label: "Matinée", hours: "7h – 11h" },
  { value: "dejeuner", label: "Déjeuner", hours: "12h – 14h" },
  { value: "apres-midi", label: "Après-midi", hours: "14h – 18h" },
  { value: "diner", label: "Dîner", hours: "19h – 23h" },
  { value: "soiree", label: "Soirée", hours: "19h – 23h" },
  { value: "nuit", label: "Nuit", hours: "22h – 6h" },
] as const;

interface MoreFiltersPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityName: string | null;
  subcategoryName: string | null;
  categoryName: string | null;
  /** Currently selected time slots */
  selectedTimeSlots: string[];
  onTimeSlotsChange: (slots: string[]) => void;
  /** Currently selected engagements */
  selectedEngagements: string[];
  onEngagementsChange: (engs: string[]) => void;
  /** Currently selected commodités */
  selectedCommodites: string[];
  onCommoditesChange: (coms: string[]) => void;
}

const MoreFiltersPopup = ({
  open,
  onOpenChange,
  cityName,
  subcategoryName,
  categoryName,
  selectedTimeSlots,
  onTimeSlotsChange,
  selectedEngagements,
  onEngagementsChange,
  selectedCommodites,
  onCommoditesChange,
}: MoreFiltersPopupProps) => {
  const [engagements, setEngagements] = useState<string[]>([]);
  const [commodites, setCommodites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch engagements/commodités used by businesses matching city + subcategory/category
  useEffect(() => {
    if (!open || !cityName) {
      setEngagements([]);
      setCommodites([]);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);

      // Paginate to bypass the 1000-row limit
      const allBusinesses: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore && !cancelled) {
        let query = supabase
          .from("businesses")
          .select("engagements")
          .eq("city", cityName)
          .eq("is_active", true);

        if (subcategoryName) {
          query = query.contains("categories", [subcategoryName]);
        } else if (categoryName) {
          query = query.eq("main_category", categoryName);
        }

        const { data } = await query.range(offset, offset + batchSize - 1);
        if (data && data.length > 0) {
          allBusinesses.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (cancelled) { setLoading(false); return; }

      const engSet = new Set<string>();
      const comSet = new Set<string>();

      allBusinesses.forEach((b: any) => {
        (b.engagements || []).forEach((e: string) => {
          const trimmed = (e || "").trim();
          if (!trimmed) return;
          if (trimmed.startsWith("Certification:")) return;
          if (trimmed.startsWith("Logistique:")) {
            comSet.add(trimmed);
          } else {
            engSet.add(trimmed);
          }
        });
      });

      if (!cancelled) {
        setEngagements([...engSet].sort((a, b) => a.localeCompare(b, "fr")));
        setCommodites([...comSet].sort((a, b) => a.localeCompare(b, "fr")));
        setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [open, cityName, subcategoryName, categoryName]);

  const toggleTimeSlot = (slot: string) => {
    const newSlots = selectedTimeSlots.includes(slot)
      ? selectedTimeSlots.filter(s => s !== slot)
      : [...selectedTimeSlots, slot];
    onTimeSlotsChange(newSlots);
  };

  const toggleEngagement = (eng: string) => {
    const newEngs = selectedEngagements.includes(eng)
      ? selectedEngagements.filter(e => e !== eng)
      : [...selectedEngagements, eng];
    onEngagementsChange(newEngs);
  };

  const toggleCommodite = (com: string) => {
    const newComs = selectedCommodites.includes(com)
      ? selectedCommodites.filter(c => c !== com)
      : [...selectedCommodites, com];
    onCommoditesChange(newComs);
  };

  const totalActive = selectedTimeSlots.length + selectedEngagements.length + selectedCommodites.length;

  const cleanLabel = (s: string) => s.replace(/^(Logistique:|Marché:)/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Plus de filtres
            {totalActive > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {totalActive}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 1. Créneaux horaires */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Créneaux horaires
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOT_OPTIONS.map(ts => {
              const isActive = selectedTimeSlots.includes(ts.value);
              return (
                <button
                  key={ts.value}
                  onClick={() => toggleTimeSlot(ts.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex flex-col items-center gap-0.5 min-w-[80px] ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{ts.label}</span>
                  <span className={`text-[10px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                    {ts.hours}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Engagements */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Leaf className="h-4 w-4 text-muted-foreground" />
            Engagements
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground italic">Chargement…</p>
          ) : engagements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucun engagement disponible</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {engagements.map(eng => {
                const isActive = selectedEngagements.includes(eng);
                return (
                  <button
                    key={eng}
                    onClick={() => toggleEngagement(eng)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {cleanLabel(eng)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Commodités */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="h-4 w-4 text-muted-foreground" />
            Commodités
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground italic">Chargement…</p>
          ) : commodites.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune commodité disponible</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {commodites.map(com => {
                const isActive = selectedCommodites.includes(com);
                return (
                  <button
                    key={com}
                    onClick={() => toggleCommodite(com)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {cleanLabel(com)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset button */}
        {totalActive > 0 && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => {
                onTimeSlotsChange([]);
                onEngagementsChange([]);
                onCommoditesChange([]);
              }}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Réinitialiser tous les filtres
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MoreFiltersPopup;
