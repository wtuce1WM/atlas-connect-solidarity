import { useRef, useEffect } from "react";
import type { FrontStructureTab } from "@/hooks/useFrontStructureTabs";

interface Props {
  tabs: FrontStructureTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string | null) => void;
}

export default function FrontStructureNavBar({ tabs, activeTabId, onTabClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current) return;
    if (activeTabId === null) {
      // "Votre recherche" clicked — scroll to start on mobile/tablet
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const activeEl = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* "Tous" tab */}
      <button
        onClick={() => onTabClick(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap backdrop-blur-sm ${
          activeTabId === null
            ? "bg-[#D4AF37] text-black"
            : "bg-black/50 text-white hover:bg-black/70"
        }`}
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        Votre recherche
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          onClick={() => onTabClick(tab.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap backdrop-blur-sm ${
            activeTabId === tab.id
              ? "bg-[#D4AF37] text-black"
              : "bg-black/50 text-white hover:bg-black/70"
          }`}
          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
        >
          {tab.name}
          <span className="ml-1 opacity-70">{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
