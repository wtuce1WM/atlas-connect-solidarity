import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
  continuous?: boolean;
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
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
          <span>Jour</span>
          <span className="w-24 text-center">Ouverture</span>
          <span className="w-24 text-center">Fermeture</span>
          <span className="w-24 text-center">Continu</span>
          <span className="w-20 text-center">Fermé</span>
        </div>

        {(Object.keys(DAYS_FR) as (keyof OpeningHours)[]).map((day) => (
          <div
            key={day}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 p-3 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{DAYS_FR[day]}</span>
              <button
                type="button"
                onClick={() => applyToAll(day)}
                className="text-xs text-primary hover:underline"
                title="Appliquer à tous les jours"
              >
                Appliquer à tous
              </button>
            </div>

            <Input
              type="time"
              value={hours[day].open}
              onChange={(e) => handleDayChange(day, "open", e.target.value)}
              disabled={hours[day].closed}
              className="w-24 h-8 text-sm"
            />

            <Input
              type="time"
              value={hours[day].close}
              onChange={(e) => handleDayChange(day, "close", e.target.value)}
              disabled={hours[day].closed}
              className="w-24 h-8 text-sm"
            />

            <div className="w-24 flex justify-center">
              <Checkbox
                checked={!!hours[day].continuous}
                onCheckedChange={(checked) =>
                  handleDayChange(day, "continuous", !!checked)
                }
                disabled={hours[day].closed}
              />
            </div>

            <div className="w-20 flex justify-center">
              <Checkbox
                checked={hours[day].closed}
                onCheckedChange={(checked) =>
                  handleDayChange(day, "closed", !!checked)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Cochez "Fermé" pour les jours de fermeture. Cliquez sur "Appliquer à tous" pour copier les horaires d'un jour vers tous les autres.
      </p>
    </div>
  );
};

export default OpeningHoursEditor;
