import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface VacationPeriod {
  start_date: string;
  end_date: string;
}

interface VacationDatesEditorProps {
  value: VacationPeriod[];
  onChange: (periods: VacationPeriod[]) => void;
}

const VacationDatesEditor = ({ value, onChange }: VacationDatesEditorProps) => {
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newEndDate, setNewEndDate] = useState<Date>();

  const addPeriod = () => {
    if (newStartDate && newEndDate) {
      const newPeriod: VacationPeriod = {
        start_date: format(newStartDate, "yyyy-MM-dd"),
        end_date: format(newEndDate, "yyyy-MM-dd"),
      };
      onChange([...value, newPeriod]);
      setNewStartDate(undefined);
      setNewEndDate(undefined);
    }
  };

  const removePeriod = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Vacances / Fermetures exceptionnelles</Label>
      
      {/* Existing periods */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((period, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-white border rounded-lg"
            >
              <span className="text-sm">
                Du{" "}
                <span className="font-medium">
                  {format(new Date(period.start_date), "d MMMM yyyy", { locale: fr })}
                </span>{" "}
                au{" "}
                <span className="font-medium">
                  {format(new Date(period.end_date), "d MMMM yyyy", { locale: fr })}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removePeriod(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new period */}
      <div className="flex flex-wrap items-end gap-3 p-3 bg-white/50 border rounded-lg">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date de début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !newStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newStartDate ? (
                  format(newStartDate, "d MMM yyyy", { locale: fr })
                ) : (
                  <span>Sélectionner...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newStartDate}
                onSelect={setNewStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date de fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !newEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newEndDate ? (
                  format(newEndDate, "d MMM yyyy", { locale: fr })
                ) : (
                  <span>Sélectionner...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newEndDate}
                onSelect={setNewEndDate}
                disabled={(date) => newStartDate ? date < newStartDate : false}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button
          type="button"
          onClick={addPeriod}
          disabled={!newStartDate || !newEndDate}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucune période de vacances définie. Utilisez le formulaire ci-dessus pour en ajouter.
        </p>
      )}
    </div>
  );
};

export default VacationDatesEditor;
