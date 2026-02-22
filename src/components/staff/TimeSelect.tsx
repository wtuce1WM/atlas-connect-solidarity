import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

interface TimeSelectProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  disabled?: boolean;
}

const TimeSelect = ({ value, onChange, disabled }: TimeSelectProps) => {
  const isEmpty = !value || value === "";
  const [h, m] = (value || "00:00").split(":");
  const hour = HOURS.includes(h) ? h : "00";
  const minute = MINUTES.includes(m) ? m : "00";

  const update = (newH: string, newM: string) => onChange(`${newH}:${newM}`);

  return (
    <div className="flex items-center gap-0.5">
      <Select value={hour} onValueChange={(v) => update(v, minute)} disabled={disabled}>
        <SelectTrigger className="w-[52px] h-8 text-xs px-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hh) => (
            <SelectItem key={hh} value={hh} className="text-xs">{hh}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-xs">:</span>
      <Select value={minute} onValueChange={(v) => update(hour, v)} disabled={disabled}>
        <SelectTrigger className="w-[48px] h-8 text-xs px-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((mm) => (
            <SelectItem key={mm} value={mm} className="text-xs">{mm}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimeSelect;
