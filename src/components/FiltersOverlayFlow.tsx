import { useEffect, useMemo, useState } from "react";
import { X, Circle, CheckCircle2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";

interface FrontTab {
  id: string;
  name: string;
  count: number;
  subcategories: FrontStructureSubTab[];
  subcategoryNames: Set<string>;
}

interface ServiceItem {
  id: string;
  name_fr: string;
}

interface Props {
  frontTabs: FrontTab[];
  activeFsTabId: string | null;
  activeFsSubId: string | null;
  activeFsServices: string[];
  onTabClick: (tabId: string | null) => void;
  onSubClick: (subId: string | null) => void;
  onServicesChange: (svcs: string[]) => void;
  subPool: Array<{ services?: string[] | null }>;
  onClose: () => void;
}

/**
 * Single-column 3-step filter flow inside the Filters overlay.
 * Step 1: front-structure entries
 * Step 2: subcategories of the active tab
 * Step 3: services of the active subcategory
 * The close (X) button acts as "back" at steps 2/3, and closes the overlay at step 1.
 */
export default function FiltersOverlayFlow({
  frontTabs,
  activeFsTabId,
  activeFsSubId,
  activeFsServices,
  onTabClick,
  onSubClick,
  onServicesChange,
  subPool,
  onClose,
}: Props) {
  const activeTab = activeFsTabId ? frontTabs.find((t) => t.id === activeFsTabId) || null : null;
  const activeSub = activeFsSubId && activeTab
    ? activeTab.subcategories.find((s) => s.id === activeFsSubId) || null
    : null;

  const step: 1 | 2 | 3 = activeSub ? 3 : activeTab ? 2 : 1;

  const [services, setServices] = useState<ServiceItem[]>([]);
  useEffect(() => {
    if (!activeFsSubId) {
      setServices([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name_fr")
        .eq("subcategory_id", activeFsSubId)
        .eq("is_active", true)
        .order("name_fr", { ascending: true });
      if (!cancelled && data) setServices(data as ServiceItem[]);
    })();
    return () => { cancelled = true; };
  }, [activeFsSubId]);

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

  const handleBack = () => {
    if (step === 3) onSubClick(null);
    else if (step === 2) onTabClick(null);
    else onClose();
  };

  const title = step === 3 ? (activeSub?.name || "") : step === 2 ? (activeTab?.name || "") : "Filtres";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-black/10 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-black"
          aria-label={step === 1 ? "Fermer les filtres" : "Retour"}
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-black truncate" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
          {title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {step === 1 && frontTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 transition-colors text-left"
          >
            <span
              className="flex-1 text-sm text-black"
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            >
              {tab.name}
            </span>
            <span className="text-xs text-black/50 bg-black/5 rounded-full px-2 py-0.5 min-w-[24px] text-center">
              {tab.count}
            </span>
            <ChevronRight className="h-4 w-4 text-black/40 shrink-0" />
          </button>
        ))}

        {step === 2 && activeTab && activeTab.subcategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSubClick(sub.id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 transition-colors text-left"
          >
            <span
              className="flex-1 text-sm text-black"
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            >
              {sub.name}
            </span>
            <span className="text-xs text-black/50 bg-black/5 rounded-full px-2 py-0.5 min-w-[24px] text-center">
              {sub.count}
            </span>
            <ChevronRight className="h-4 w-4 text-black/40 shrink-0" />
          </button>
        ))}

        {step === 3 && (
          <>
            {visibleServices.length === 0 && (
              <p className="px-3 py-2 text-xs text-black/50">Aucun service disponible.</p>
            )}
            {visibleServices.map((s) => {
              const selected = activeFsServices.includes(s.name_fr);
              return (
                <button
                  key={s.id}
                  onClick={() => onServicesChange(selected ? [] : [s.name_fr])}
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
                    {s.name_fr}
                  </span>
                  <span className="text-xs text-black/50 bg-black/5 rounded-full px-2 py-0.5 min-w-[24px] text-center">
                    {serviceCounts.get(s.name_fr) || 0}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
