import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, X } from "lucide-react";
import TimeSelect from "./TimeSelect";

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  continuous?: boolean;
  open2?: string;
  close2?: string;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DAYS_FR: Record<keyof OpeningHours, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "09:00", close: "13:00", closed: false },
  sunday: { open: "", close: "", closed: true },
};

interface OpeningHoursEditorProps {
  value: OpeningHours | null;
  onChange: (hours: OpeningHours) => void;
}

// Map French day keys to English if needed
const FR_TO_EN: Record<string, keyof OpeningHours> = {
  lundi: "monday",
  mardi: "tuesday",
  mercredi: "wednesday",
  jeudi: "thursday",
  vendredi: "friday",
  samedi: "saturday",
  dimanche: "sunday",
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

const OpeningHoursEditor = ({ value, onChange }: OpeningHoursEditorProps) => {
  const hours = normalizeHours(value);

  const handleDayChange = (
    day: keyof OpeningHours,
    field: keyof DayHours,
    newValue: string | boolean
  ) => {
    const updatedHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: newValue,
      },
    };
    onChange(updatedHours);
  };

  const applyToAll = (day: keyof OpeningHours) => {
    const sourceDay = hours[day];
    const updatedHours = { ...hours };
    (Object.keys(hours) as (keyof OpeningHours)[]).forEach((d) => {
      updatedHours[d] = { ...sourceDay };
    });
    onChange(updatedHours);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base font-semibold">Horaires d'ouverture</Label>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[100px_1fr] gap-2 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
          <span>Jour</span>
          <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-2 items-center">
            <span className="w-24 text-center">Ouverture</span>
            <span className="w-24 text-center">Fermeture</span>
            <span className="w-24 text-center">Ouvert. 2</span>
            <span className="w-24 text-center">Fermet. 2</span>
            <span className="w-16 text-center">Continu</span>
            <span className="w-16 text-center">Fermé</span>
            <span className="w-20"></span>
          </div>
        </div>

        {(Object.keys(DAYS_FR) as (keyof OpeningHours)[]).map((day) => {
          const dh = hours[day];
          const hasSlot2 = !!(dh.open2 || dh.close2);
          const isContinuous = !!dh.continuous;

          return (
            <div
              key={day}
              className="grid grid-cols-[100px_1fr] gap-2 p-3 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium text-sm">{DAYS_FR[day]}</span>

              <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto_auto] gap-2 items-center">
                {/* Slot 1 */}
                <div className="flex items-center gap-0.5">
                  <TimeSelect
                    value={dh.closed ? "" : dh.open}
                    onChange={(v) => handleDayChange(day, "open", v)}
                    disabled={dh.closed}
                  />
                  {dh.open && !dh.closed && (
                    <button type="button" onClick={() => { handleDayChange(day, "open", ""); handleDayChange(day, "close", ""); }} className="text-muted-foreground hover:text-destructive p-0.5" title="Vider créneau 1"><X className="h-3 w-3" /></button>
                  )}
                </div>
                <TimeSelect
                  value={dh.closed ? "" : dh.close}
                  onChange={(v) => handleDayChange(day, "close", v)}
                  disabled={dh.closed || !dh.open}
                />

                {/* Slot 2 */}
                <div className="flex items-center gap-0.5">
                  <TimeSelect
                    value={(dh.closed || isContinuous) ? "" : (dh.open2 || "")}
                    onChange={(v) => handleDayChange(day, "open2", v)}
                    disabled={dh.closed || isContinuous}
                  />
                  {dh.open2 && !dh.closed && !isContinuous && (
                    <button type="button" onClick={() => { handleDayChange(day, "open2", ""); handleDayChange(day, "close2", ""); }} className="text-muted-foreground hover:text-destructive p-0.5" title="Vider créneau 2"><X className="h-3 w-3" /></button>
                  )}
                </div>
                <TimeSelect
                  value={(dh.closed || isContinuous) ? "" : (dh.close2 || "")}
                  onChange={(v) => handleDayChange(day, "close2", v)}
                  disabled={dh.closed || isContinuous || !dh.open2}
                />

                {/* Continuous */}
                <div className="w-16 flex justify-center">
                  <Checkbox
                    checked={isContinuous}
                    onCheckedChange={(checked) => {
                      const updatedHours = {
                        ...hours,
                        [day]: {
                          ...hours[day],
                          continuous: !!checked,
                          // Clear slot 2 when marking continuous
                          ...(checked ? { open2: "", close2: "" } : {}),
                        },
                      };
                      onChange(updatedHours);
                    }}
                    disabled={dh.closed}
                  />
                </div>

                {/* Closed */}
                <div className="w-16 flex justify-center">
                  <Checkbox
                    checked={dh.closed}
                    onCheckedChange={(checked) =>
                      handleDayChange(day, "closed", !!checked)
                    }
                  />
                </div>

                {/* Apply to all */}
                <button
                  type="button"
                  onClick={() => applyToAll(day)}
                  className="text-xs text-primary hover:underline w-20 text-center"
                  title="Appliquer à tous les jours"
                >
                  → Tous
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Remplissez "Ouvert. 2" et "Fermet. 2" pour un 2ème créneau (ex: midi + soir). Cochez "Continu" si service non-stop. Cochez "Fermé" pour les jours de fermeture.
      </p>
    </div>
  );
};

export default OpeningHoursEditor;
