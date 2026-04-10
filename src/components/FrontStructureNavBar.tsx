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
    if (!activeTabId || !scrollRef.current) return;
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
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
          activeTabId === null
            ? "bg-[#D4AF37] text-black"
            : "bg-white/20 text-white hover:bg-white/30"
        }`}
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        Tous
      </button>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          onClick={() => onTabClick(tab.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
            activeTabId === tab.id
              ? "bg-[#D4AF37] text-black"
              : "bg-white/20 text-white hover:bg-white/30"
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
