import { useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, Circle, CheckCircle2, Square, CheckSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";

interface Props {
  subcategories: FrontStructureSubTab[];
  activeSubId: string | null;
  onSubClick: (subId: string | null) => void;
  /** Pool of businesses already matching the active subcategory — used to compute service counts. */
  subPool?: Array<{ services?: string[] | null }>;
  selectedServices?: string[];
  onServicesChange?: (services: string[]) => void;
}

interface ServiceItem {
  id: string;
  name_fr: string;
}

export default function FrontStructureSubNavBar({
  subcategories,
  activeSubId,
  onSubClick,
  subPool = [],
  selectedServices = [],
  onServicesChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Fetch active services for the active subcategory
  useEffect(() => {
    if (!activeSubId) {
      setServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name_fr")
        .eq("subcategory_id", activeSubId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (!cancelled && data) setServices(data as ServiceItem[]);
    })();
    return () => { cancelled = true; };
  }, [activeSubId]);

  // Compute counts per service from the sub pool
  const serviceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of subPool) {
      const list = b.services || [];
      for (const s of list) m.set(s, (m.get(s) || 0) + 1);
    }
    return m;
  }, [subPool]);

  // Services with at least 1 matching business
  const visibleServices = useMemo(
    () => services.filter((s) => (serviceCounts.get(s.name_fr) || 0) > 0),
    [services, serviceCounts]
  );

  if (subcategories.length === 0) return null;

  const active = subcategories.find((s) => s.id === activeSubId) || null;
  const totalActive = (active ? 1 : 0) + selectedServices.length;

  const toggleService = (name: string) => {
    if (!onServicesChange) return;
    if (selectedServices.includes(name)) {
      onServicesChange(selectedServices.filter((s) => s !== name));
    } else {
      onServicesChange([...selectedServices, name]);
    }
  };

  const SubRow = ({
    selected, label, count, onClick,
  }: { selected: boolean; label: string; count?: number; onClick: () => void }) => (
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

  const ServiceRow = ({
    selected, label, count, onClick,
  }: { selected: boolean; label: string; count: number; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 transition-colors text-left"
    >
      {selected ? (
        <CheckSquare className="h-5 w-5 text-black shrink-0" strokeWidth={2} />
      ) : (
        <Square className="h-5 w-5 text-black/40 shrink-0" strokeWidth={1.5} />
      )}
      <span
        className={`flex-1 text-sm ${selected ? "font-semibold text-black" : "text-black/70"}`}
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        {label}
      </span>
      <span className="text-xs text-black/50 bg-black/5 rounded-full px-2 py-0.5 min-w-[24px] text-center">
        {count}
      </span>
    </button>
  );

  return (
    <div className="flex justify-end px-3 pb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`relative shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-black border-2 border-black shadow-lg transition-colors ${
              totalActive > 0 ? "ring-2 ring-gold" : "hover:bg-neutral-50"
            }`}
            aria-label="Filtrer par sous-catégorie"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {totalActive > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center shadow">
                {totalActive}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-72 p-2 bg-white border-0 shadow-xl rounded-xl z-[250]"
        >
          <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-black/40 font-semibold">
            Sous-catégorie
          </div>
          <SubRow
            selected={activeSubId === null}
            label="Toutes"
            onClick={() => {
              onSubClick(null);
              onServicesChange?.([]);
              setOpen(false);
            }}
          />
          <div className="max-h-64 overflow-y-auto">
            {subcategories.map((sub) => (
              <SubRow
                key={sub.id}
                selected={activeSubId === sub.id}
                label={sub.name}
                count={sub.count}
                onClick={() => {
                  onSubClick(sub.id);
                  onServicesChange?.([]);
                }}
              />
            ))}
          </div>

          {active && visibleServices.length > 0 && (
            <>
              <div className="h-px bg-black/10 my-2" />
              <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-black/40 font-semibold flex items-center justify-between">
                <span>Services ({active.name})</span>
                {selectedServices.length > 0 && (
                  <button
                    onClick={() => onServicesChange?.([])}
                    className="text-[10px] normal-case font-normal text-black/50 hover:text-black underline"
                  >
                    réinitialiser
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {visibleServices.map((s) => (
                  <ServiceRow
                    key={s.id}
                    selected={selectedServices.includes(s.name_fr)}
                    label={s.name_fr}
                    count={serviceCounts.get(s.name_fr) || 0}
                    onClick={() => toggleService(s.name_fr)}
                  />
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
