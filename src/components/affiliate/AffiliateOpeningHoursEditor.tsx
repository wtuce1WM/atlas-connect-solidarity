import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, Plus, X, Copy, Check } from "lucide-react";
import TimeSelect from "@/components/staff/TimeSelect";
import type { OpeningHours, DayHours } from "@/components/staff/OpeningHoursEditor";
import { DEFAULT_OPENING_HOURS } from "@/components/staff/OpeningHoursEditor";
import { cn } from "@/lib/utils";

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

type Status = "open" | "closed" | "247";

const getStatus = (dh: DayHours): Status =>
  dh.closed ? "closed" : dh.continuous ? "247" : "open";

const formatRange = (dh: DayHours): string => {
  if (dh.closed) return "Fermé";
  if (dh.continuous) return "Ouvert 24h/24";
  const s1 = dh.open && dh.close ? `${dh.open} – ${dh.close}` : "—";
  if (dh.open2 && dh.close2) return `${s1}  ·  ${dh.open2} – ${dh.close2}`;
  return s1;
};

interface Props {
  value: OpeningHours | null;
  onChange: (hours: OpeningHours) => void;
  showOpeningHours?: boolean;
}

const AffiliateOpeningHoursEditor = ({ value, onChange, showOpeningHours = true }: Props) => {
  const hours = normalizeHours(value);
  const [copiedFrom, setCopiedFrom] = useState<keyof OpeningHours | null>(null);

  const updateDay = (day: keyof OpeningHours, patch: Partial<DayHours>) => {
    onChange({ ...hours, [day]: { ...hours[day], ...patch } });
  };

  const setStatus = (day: keyof OpeningHours, status: Status) => {
    if (status === "closed") {
      updateDay(day, { closed: true, continuous: false });
    } else if (status === "247") {
      updateDay(day, { closed: false, continuous: true, open2: "", close2: "" });
    } else {
      const dh = hours[day];
      updateDay(day, {
        closed: false,
        continuous: false,
        open: dh.open || "09:00",
        close: dh.close || "19:00",
      });
    }
  };

  const addBreak = (day: keyof OpeningHours) => {
    const dh = hours[day];
    updateDay(day, {
      close: "12:00",
      open2: "14:00",
      close2: dh.close || "19:00",
    });
  };

  const removeBreak = (day: keyof OpeningHours) => {
    const dh = hours[day];
    updateDay(day, {
      close: dh.close2 || dh.close,
      open2: "",
      close2: "",
    });
  };

  const applyToAll = (day: keyof OpeningHours) => {
    const source = hours[day];
    const next = { ...hours };
    (Object.keys(hours) as (keyof OpeningHours)[]).forEach((d) => {
      next[d] = { ...source };
    });
    onChange(next);
    setCopiedFrom(day);
    setTimeout(() => setCopiedFrom(null), 1600);
  };

  const StatusPill = ({
    active,
    onClick,
    children,
    variant,
    neutralized = false,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    variant: "open" | "closed" | "247";
    neutralized?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
        active && !neutralized
          ? variant === "open"
            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
            : variant === "closed"
            ? "bg-rose-100 text-rose-800 border-rose-300"
            : "bg-sky-100 text-sky-800 border-sky-300"
          : "bg-background text-muted-foreground border-border hover:border-foreground/30"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base font-semibold">Horaires d'ouverture</Label>
      </div>

      <div className="space-y-2">
        {(Object.keys(DAYS_FR) as (keyof OpeningHours)[]).map((day) => {
          const dh = hours[day];
          const status = getStatus(dh);
          const hasBreak = !!(dh.open2 || dh.close2);

          return (
            <div
              key={day}
              className="rounded-lg border bg-card p-3 sm:p-4 hover:border-foreground/20 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Jour */}
                <div className="w-20 shrink-0">
                  <div className="font-semibold text-sm">{DAYS_FR[day]}</div>
                </div>

                {/* Pills statut */}
                <div className="flex items-center gap-1.5">
                  <StatusPill
                    active={status === "open"}
                    onClick={() => setStatus(day, "open")}
                    variant="open"
                    neutralized={!showOpeningHours}
                  >
                    Ouvert
                  </StatusPill>
                  <StatusPill
                    active={status === "closed"}
                    onClick={() => setStatus(day, "closed")}
                    variant="closed"
                  >
                    Fermé
                  </StatusPill>
                  <StatusPill
                    active={status === "247"}
                    onClick={() => setStatus(day, "247")}
                    variant="247"
                  >
                    24h/24
                  </StatusPill>
                </div>

                {/* Plage affichée + éditeur en popover */}
                <div className="flex-1 min-w-[180px] text-right">
                  {status === "open" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="font-mono text-sm text-foreground hover:text-primary hover:underline underline-offset-4 tabular-nums"
                        >
                          {formatRange(dh)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-auto p-3 space-y-3">
                        <div className="flex items-center gap-1.5">
                          {hasBreak && (
                            <span className="text-[10px] uppercase text-muted-foreground w-16">Matin</span>
                          )}
                          <TimeSelect value={dh.open} onChange={(v) => updateDay(day, { open: v })} />
                          <span className="text-muted-foreground text-xs">→</span>
                          <TimeSelect value={dh.close} onChange={(v) => updateDay(day, { close: v })} />
                        </div>
                        {hasBreak ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase text-muted-foreground w-16">Après-midi</span>
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
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1 w-full justify-start"
                            onClick={() => addBreak(day)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Ajouter une pause déjeuner
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      {formatRange(dh)}
                    </span>
                  )}
                </div>

                {/* Copier */}
                <button
                  type="button"
                  onClick={() => applyToAll(day)}
                  className={cn(
                    "text-xs inline-flex items-center gap-1 shrink-0 transition-colors",
                    copiedFrom === day
                      ? "text-emerald-600"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  title="Copier ces horaires sur toute la semaine"
                >
                  {copiedFrom === day ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copier sur la semaine
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Cliquez sur la plage horaire pour l'éditer. Ajoutez une pause déjeuner si vous fermez en milieu de journée.
      </p>
    </div>
  );
};

export default AffiliateOpeningHoursEditor;
