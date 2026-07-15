import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTaxonomyTranslations } from "@/hooks/useTaxonomyTranslations";
import { translateFrontStructure } from "@/lib/frontStructureTranslations";

const T = {
  categories: { fr: "Catégories", en: "Categories", ar: "الفئات" },
  breadcrumb: { fr: "Fil d'Ariane", en: "Breadcrumb", ar: "مسار التصفح" },
  close: { fr: "Fermer les filtres", en: "Close filters", ar: "إغلاق الفلاتر" },
  back: { fr: "Retour", en: "Back", ar: "رجوع" },
} as const;

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
  subcategory_id: string;
}

interface PoolItem {
  main_category?: string | null;
  categories?: string[] | null;
  services?: string[] | null;
}

interface Props {
  frontTabs: FrontTab[];
  activeFsTabId: string | null;
  activeFsSubId: string | null;
  activeFsServices: string[];
  onTabClick: (tabId: string | null) => void;
  onSubClick: (subId: string | null) => void;
  onServicesChange: (svcs: string[]) => void;
  pool: PoolItem[];
  onClose: () => void;
}

/**
 * Single-column 3-step filter flow inside the Filters overlay.
 * Step 1: front-structure entries
 * Step 2: subcategories of the active tab
 * Step 3: services of the active subcategory
 * The close (X) button acts as "back" at steps 2/3, and closes the overlay at step 1.
 *
 * Behaviour: if a subcategory has no available service, picking it skips step 3
 * (applies the filter and, on mobile/tablet, closes the overlay).
 */
export default function FiltersOverlayFlow({
  frontTabs,
  activeFsTabId,
  activeFsSubId,
  activeFsServices,
  onTabClick,
  onSubClick,
  onServicesChange,
  pool,
  onClose,
}: Props) {
  const { language } = useLanguage();
  const { translateSubcategory, translateService } = useTaxonomyTranslations();
  const tr = (k: keyof typeof T) => T[k][language as "fr" | "en" | "ar"] || T[k].fr;

  const activeTab = activeFsTabId ? frontTabs.find((t) => t.id === activeFsTabId) || null : null;
  const activeSub = activeFsSubId && activeTab
    ? activeTab.subcategories.find((s) => s.id === activeFsSubId) || null
    : null;

  const step: 1 | 2 | 3 = activeSub ? 3 : activeTab ? 2 : 1;

  // Prefetch services for ALL subcategories of the active tab in one query
  // so we can know upfront which sub-categories have at least one available service.
  const [tabServices, setTabServices] = useState<ServiceItem[]>([]);
  useEffect(() => {
    if (!activeTab) {
      setTabServices([]);
      return;
    }
    const subIds = activeTab.subcategories.map((s) => s.id);
    if (subIds.length === 0) { setTabServices([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name_fr, subcategory_id")
        .in("subcategory_id", subIds)
        .eq("is_active", true)
        .order("name_fr", { ascending: true });
      if (!cancelled && data) setTabServices(data as ServiceItem[]);
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Resolve the parent "category" name of the active tab by looking up the
  // parent category of the tab's subcategories. We display the most frequent
  // one as a non-clickable breadcrumb segment between "Filtres" and the tab.
  const [parentCategoryName, setParentCategoryName] = useState<string | null>(null);
  useEffect(() => {
    if (!activeTab) { setParentCategoryName(null); return; }
    const subIds = activeTab.subcategories.map((s) => s.id);
    if (subIds.length === 0) { setParentCategoryName(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("subcategories")
        .select("category_id, categories!inner(name_fr)")
        .in("id", subIds);
      if (cancelled || !data) return;
      const counts = new Map<string, number>();
      for (const row of data as any[]) {
        const name = row.categories?.name_fr;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      }
      let best: string | null = null;
      let bestCount = 0;
      for (const [name, c] of counts) {
        if (c > bestCount) { best = name; bestCount = c; }
      }
      setParentCategoryName(best);
    })();
    return () => { cancelled = true; };
  }, [activeTab]);



  // For each sub of the active tab, compute its own subPool + visible services count.
  const subAvailability = useMemo(() => {
    const m = new Map<string, number>(); // subId -> visibleServicesCount
    if (!activeTab) return m;
    for (const sub of activeTab.subcategories) {
      const subPool = pool.filter(
        (b) =>
          (b.main_category && sub.names.has(b.main_category)) ||
          b.categories?.some((c: string) => sub.names.has(c))
      );
      const counts = new Map<string, number>();
      for (const b of subPool) {
        for (const s of b.services || []) counts.set(s, (counts.get(s) || 0) + 1);
      }
      const visible = tabServices.filter(
        (s) => s.subcategory_id === sub.id && (counts.get(s.name_fr) || 0) > 0
      );
      m.set(sub.id, visible.length);
    }
    return m;
  }, [activeTab, tabServices, pool]);

  // Active sub's pool + service counts (step 3)
  const activeSubPool = useMemo(() => {
    if (!activeSub) return [];
    return pool.filter(
      (b) =>
        (b.main_category && activeSub.names.has(b.main_category)) ||
        b.categories?.some((c: string) => activeSub.names.has(c))
    );
  }, [activeSub, pool]);

  const serviceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of activeSubPool) {
      for (const s of b.services || []) m.set(s, (m.get(s) || 0) + 1);
    }
    return m;
  }, [activeSubPool]);

  const visibleServices = useMemo(
    () =>
      tabServices.filter(
        (s) => s.subcategory_id === activeFsSubId && (serviceCounts.get(s.name_fr) || 0) > 0
      ),
    [tabServices, serviceCounts, activeFsSubId]
  );

  const handleBack = () => {
    onClose();
  };

  const handleSubClick = (subId: string) => {
    onSubClick(subId);
    // If this sub has no available service, skip step 3 entirely:
    // apply the filter and close the overlay (scroll results to top).
    if ((subAvailability.get(subId) || 0) === 0) {
      onClose();
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      }
    }
  };

  const badgeBase = "relative inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm md:px-6 md:py-3 md:text-lg font-semibold transition-all overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),inset_0_-1px_2px_0_rgba(255,255,255,0.25),0_4px_16px_-4px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/50 before:via-white/10 before:to-white/30 before:pointer-events-none [&>*]:relative [&>*]:z-10";
  const badgeIdle = "bg-white/20 text-black hover:bg-white/30";
  const badgeSelected = "bg-black/70 text-white hover:bg-black/80";


  // Step 3 fallback: if user reached step 3 but no services are visible
  // (e.g. tab service prefetch hasn't returned yet), we still render gracefully.
  const showStep3 = step === 3 && (subAvailability.get(activeFsSubId!) ?? 1) > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="relative z-10 shrink-0 flex items-center px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-black hover:bg-black/90 flex items-center justify-center text-white cursor-pointer touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
          aria-label={step === 1 ? "Fermer les filtres" : "Retour"}
        >
          <X className="h-4 w-4 pointer-events-none" />
        </button>
        <nav
          className="flex-1 min-w-0 px-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-white"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
          aria-label="Fil d'Ariane"
        >
          <button
            type="button"
            onClick={() => onTabClick(null)}
            className={`truncate hover:underline ${step === 1 ? "opacity-100" : "opacity-60"}`}
          >
            Catégories
          </button>
          {activeTab && (
            <>
              <span aria-hidden="true" className="opacity-50">/</span>
              <button
                type="button"
                onClick={() => onSubClick(null)}
                className={`truncate hover:underline ${step === 2 ? "opacity-100" : "opacity-60"}`}
              >
                {activeTab.name}
              </button>
            </>
          )}
          {activeSub && (
            <>
              <span aria-hidden="true" className="opacity-50">/</span>
              <button
                type="button"
                onClick={() => onSubClick(activeSub.id)}
                className="truncate hover:underline"
              >
                {activeSub.name}
              </button>
            </>
          )}
        </nav>

        <span className="w-9 h-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-4">
          {step === 1 && frontTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabClick(tab.id)}
              className={`${badgeBase} ${badgeIdle}`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <span>{tab.name}</span>
              <span className="text-xs font-normal opacity-70">({tab.count})</span>
            </button>
          ))}

          {step === 2 && activeTab && activeTab.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => handleSubClick(sub.id)}
              className={`${badgeBase} ${badgeIdle}`}
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <span>{sub.name}</span>
              <span className="text-xs font-normal opacity-70">({sub.count})</span>
            </button>
          ))}

          {showStep3 && visibleServices.map((s) => {
            const selected = activeFsServices.includes(s.name_fr);
            return (
              <button
                key={s.id}
                onClick={() => {
                  onServicesChange(selected ? [] : [s.name_fr]);
                  onClose();
                  if (typeof window !== "undefined") {
                    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
                  }

                }}
                className={`${badgeBase} ${selected ? badgeSelected : badgeIdle}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <span>{s.name_fr}</span>
                <span className="text-xs font-normal opacity-70">({serviceCounts.get(s.name_fr) || 0})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
