import { useEffect, useMemo, useState } from "react";
import { Circle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";

interface ServiceItem {
  id: string;
  name_fr: string;
}

interface Props {
  subcategories: FrontStructureSubTab[];
  activeSubId: string | null;
  onSubClick: (subId: string | null) => void;
  subPool?: Array<{ services?: string[] | null }>;
  selectedServices?: string[];
  onServicesChange?: (services: string[]) => void;
  /** Called after the user picks a row (used to auto-close an overlay). */
  onAfterPick?: () => void;
}

/**
 * Body of the "Sous-catégorie + Services" filter, extracted from
 * FrontStructureSubNavBar so it can be reused outside of a Popover
 * (e.g. inside a side overlay above the Google Map).
 */
export default function FrontStructureSubFilterContent({
  subcategories,
  activeSubId,
  onSubClick,
  subPool = [],
  selectedServices = [],
  onServicesChange,
  onAfterPick,
}: Props) {
  const [services, setServices] = useState<ServiceItem[]>([]);

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
        .order("name_fr", { ascending: true });
      if (!cancelled && data) setServices(data as ServiceItem[]);
    })();
    return () => { cancelled = true; };
  }, [activeSubId]);

  const serviceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of subPool) {
      const list = b.services || [];
      for (const s of list) m.set(s, (m.get(s) || 0) + 1);
    }
    return m;
  }, [subPool]);

  const visibleServices = useMemo(
    () => services.filter((s) => (serviceCounts.get(s.name_fr) || 0) > 0),
    [services, serviceCounts]
  );

  const active = subcategories.find((s) => s.id === activeSubId) || null;

  const toggleService = (name: string) => {
    if (!onServicesChange) return;
    if (selectedServices.includes(name)) {
      onServicesChange([]);
    } else {
      onServicesChange([name]);
    }
  };

  const Row = ({
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
        className={`flex-1 text-sm text-black ${selected ? "font-semibold" : ""}`}
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
    <div className="p-2">
      <div>
        {subcategories.map((sub) => (
          <Row
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
          <div>
            {visibleServices.map((s) => (
              <Row
                key={s.id}
                selected={selectedServices.includes(s.name_fr)}
                label={s.name_fr}
                count={serviceCounts.get(s.name_fr) || 0}
                onClick={() => {
                  toggleService(s.name_fr);
                  onAfterPick?.();
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
