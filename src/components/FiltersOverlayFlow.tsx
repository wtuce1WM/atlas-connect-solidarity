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

  const badgeBase = "inline-flex items-center gap-2 rounded-full border backdrop-blur-sm px-4 py-2 text-sm md:px-6 md:py-3 md:text-lg font-semibold transition-colors";
  const badgeIdle = "border-white/40 bg-white/30 text-black hover:bg-white/50";
  const badgeSelected = "border-black bg-black text-white hover:bg-black/90";

  return (
    <div className="h-full flex flex-col">
      <div className="relative z-10 shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-white hover:bg-white/90 flex items-center justify-center text-black"
          aria-label={step === 1 ? "Fermer les filtres" : "Retour"}
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-black truncate" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
          {title}
        </span>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-4">
          {step === 1 && frontTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`${badgeBase} ${badgeIdle}`}
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            >
              <span>{tab.name}</span>
              <span className="text-xs font-normal opacity-70">({tab.count})</span>
            </button>
          ))}

          {step === 2 && activeTab && activeTab.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => onSubClick(sub.id)}
              className={`${badgeBase} ${badgeIdle}`}
              style={{ fontFamily: "'Josefin Sans', sans-serif" }}
            >
              <span>{sub.name}</span>
              <span className="text-xs font-normal opacity-70">({sub.count})</span>
            </button>
          ))}

          {step === 3 && (
            <>
              {visibleServices.length === 0 && (
                <p className="text-xs text-black/70">Aucun service disponible.</p>
              )}
              {visibleServices.map((s) => {
                const selected = activeFsServices.includes(s.name_fr);
                return (
                  <button
                    key={s.id}
                    onClick={() => onServicesChange(selected ? [] : [s.name_fr])}
                    className={`${badgeBase} ${selected ? badgeSelected : badgeIdle}`}
                    style={{ fontFamily: "'Josefin Sans', sans-serif" }}
                  >
                    <span>{s.name_fr}</span>
                    <span className="text-xs font-normal opacity-70">({serviceCounts.get(s.name_fr) || 0})</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
  );
}
