import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, Plus, X, Copy } from "lucide-react";
import TimeSelect from "@/components/staff/TimeSelect";
import type { OpeningHours, DayHours } from "@/components/staff/OpeningHoursEditor";
import { DEFAULT_OPENING_HOURS } from "@/components/staff/OpeningHoursEditor";

const DAYS_FR: Record<keyof OpeningHours, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const FR_TO_EN: Record<string, keyof OpeningHours> = {
  lundi: "monday", mardi: "tuesday", mercredi: "wednesday", jeudi: "thursday",
  vendredi: "friday", samedi: "saturday", dimanche: "sunday",
};

const normalizeHours = (raw: any): OpeningHours => {
  if (!raw) return DEFAULT_OPENING_HOURS;
  const result = { ...DEFAULT_OPENING_HOURS };
  for (const [key, val] of Object.entries(raw)) {
    const englishKey = FR_TO_EN[key.toLowerCase()] || (key as keyof OpeningHours);
    if (englishKey in result && val && typeof val === "object") {
      result[englishKey] = {
        open: (val as any).open || "",
        close: (val as any).close || "",
        closed: (val as any).closed ?? false,
        continuous: (val as any).continuous ?? false,
        open2: (val as any).open2 || "",
        close2: (val as any).close2 || "",
      };
    }
  }
  return result;
};

interface Props {
  value: OpeningHours | null;
  onChange: (hours: OpeningHours) => void;
}

const AffiliateOpeningHoursEditor = ({ value, onChange }: Props) => {
  const hours = normalizeHours(value);

  const updateDay = (day: keyof OpeningHours, patch: Partial<DayHours>) => {
    onChange({ ...hours, [day]: { ...hours[day], ...patch } });
  };

  const applyToAll = (day: keyof OpeningHours) => {
    const source = hours[day];
    const next = { ...hours };
    (Object.keys(hours) as (keyof OpeningHours)[]).forEach((d) => {
      next[d] = { ...source };
    });
    onChange(next);
  };

  const addBreak = (day: keyof OpeningHours) => {
    const dh = hours[day];
    // Split existing range: keep morning open→12:00, add afternoon 14:00→existing close
    const originalClose = dh.close || "19:00";
    updateDay(day, {
      close: "12:00",
      open2: "14:00",
      close2: originalClose,
      continuous: false,
    });
  };

  const removeBreak = (day: keyof OpeningHours) => {
    const dh = hours[day];
    // Merge: keep morning open, extend close to close2
    updateDay(day, {
      close: dh.close2 || dh.close,
      open2: "",
      close2: "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base font-semibold">Horaires d'ouverture</Label>
      </div>

      <div className="border rounded-lg divide-y bg-card">
        {(Object.keys(DAYS_FR) as (keyof OpeningHours)[]).map((day) => {
          const dh = hours[day];
          const hasBreak = !!(dh.open2 || dh.close2);
          const isContinuous = !!dh.continuous;
          const isClosed = !!dh.closed;

          return (
            <div key={day} className="p-3 sm:p-4">
              {/* Ligne principale : jour + statut + actions */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-medium text-sm w-20 shrink-0">{DAYS_FR[day]}</span>

                {/* Statut : Fermé */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={!isClosed}
                    onCheckedChange={(v) => updateDay(day, { closed: !v })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isClosed ? "Fermé" : "Ouvert"}
                  </span>
                </label>

                {/* Statut : 24h/24 */}
                {!isClosed && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={isContinuous}
                      onCheckedChange={(v) =>
                        updateDay(day, {
                          continuous: v,
                          ...(v ? { open2: "", close2: "", open: "00:00", close: "23:59" } : {}),
                        })
                      }
                    />
                    <span className="text-xs text-muted-foreground">24h/24</span>
                  </label>
                )}

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => applyToAll(day)}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  title="Copier ces horaires sur toute la semaine"
                >
                  <Copy className="h-3 w-3" /> Copier sur toute la semaine
                </button>
              </div>

              {/* Plage horaire */}
              {!isClosed && !isContinuous && (
                <div className="mt-3 pl-0 sm:pl-24 flex flex-wrap items-center gap-2">
                  {/* Créneau 1 (matin si break, sinon journée) */}
                  <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                    {hasBreak && (
                      <span className="text-[10px] uppercase text-muted-foreground mr-1">Matin</span>
                    )}
                    <TimeSelect value={dh.open} onChange={(v) => updateDay(day, { open: v })} />
                    <span className="text-muted-foreground text-xs">→</span>
                    <TimeSelect value={dh.close} onChange={(v) => updateDay(day, { close: v })} />
                  </div>

                  {/* Créneau 2 (après-midi) */}
                  {hasBreak ? (
                    <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
                      <span className="text-[10px] uppercase text-muted-foreground mr-1">Après-midi</span>
                      <TimeSelect value={dh.open2 || ""} onChange={(v) => updateDay(day, { open2: v })} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <TimeSelect value={dh.close2 || ""} onChange={(v) => updateDay(day, { close2: v })} />
                      <button
                        type="button"
                        onClick={() => removeBreak(day)}
                        className="ml-1 text-muted-foreground hover:text-destructive p-0.5"
                        title="Supprimer la pause"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => addBreak(day)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajouter une pause déjeuner
                    </Button>
                  )}
                </div>
              )}

              {isContinuous && (
                <div className="mt-2 pl-0 sm:pl-24 text-xs text-muted-foreground italic">
                  Ouvert 24 heures sur 24
                </div>
              )}

              {isClosed && (
                <div className="mt-2 pl-0 sm:pl-24 text-xs text-muted-foreground italic">
                  Établissement fermé ce jour
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Un seul horaire par défaut. Cliquez sur <strong>« Ajouter une pause déjeuner »</strong> si vous fermez en milieu de journée. Utilisez <strong>« Copier sur toute la semaine »</strong> pour dupliquer les horaires d'un jour.
      </p>
    </div>
  );
};

export default AffiliateOpeningHoursEditor;
