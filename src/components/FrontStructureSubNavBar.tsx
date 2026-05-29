import { useState } from "react";
import { SlidersHorizontal, Circle, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";

interface Props {
  subcategories: FrontStructureSubTab[];
  activeSubId: string | null;
  onSubClick: (subId: string | null) => void;
}

export default function FrontStructureSubNavBar({ subcategories, activeSubId, onSubClick }: Props) {
  const [open, setOpen] = useState(false);
  if (subcategories.length === 0) return null;

  const active = subcategories.find((s) => s.id === activeSubId) || null;

  const Row = ({
    selected,
    label,
    count,
    onClick,
  }: {
    selected: boolean;
    label: string;
    count?: number;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 transition-colors text-left"
    >
      {selected ? (
        <CheckCircle2 className="h-5 w-5 text-black shrink-0" strokeWidth={2} />
      ) : (
        <Circle className="h-5 w-5 text-black/40 shrink-0" strokeWidth={1.5} />
      )}
      <span
        className={`flex-1 text-sm ${selected ? "font-semibold text-black" : "text-black/70"}`}
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        {label}
      </span>
      {typeof count === "number" && (
        <span className="text-xs text-black/50 bg-black/5 rounded-full px-2 py-0.5 min-w-[24px] text-center">
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex justify-end px-3 pb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap backdrop-blur-sm ${
              active ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
            }`}
            style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            aria-label="Filtrer par sous-catégorie"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {active ? (
              <>
                <span>{active.name}</span>
                <span className="opacity-70">{active.count}</span>
              </>
            ) : (
              <span>Sous-catégories</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-64 p-2 bg-white border-0 shadow-xl rounded-xl z-[90]"
        >
          <Row
            selected={activeSubId === null}
            label="Toutes"
            onClick={() => {
              onSubClick(null);
              setOpen(false);
            }}
          />
          <div className="h-px bg-black/10 my-1" />
          <div className="max-h-80 overflow-y-auto">
            {subcategories.map((sub) => (
              <Row
                key={sub.id}
                selected={activeSubId === sub.id}
                label={sub.name}
                count={sub.count}
                onClick={() => {
                  onSubClick(sub.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
