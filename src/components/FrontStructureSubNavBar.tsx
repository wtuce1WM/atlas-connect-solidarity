import type { FrontStructureSubTab } from "@/hooks/useFrontStructureTabs";

interface Props {
  subcategories: FrontStructureSubTab[];
  activeSubId: string | null;
  onSubClick: (subId: string | null) => void;
}

export default function FrontStructureSubNavBar({ subcategories, activeSubId, onSubClick }: Props) {
  if (subcategories.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 pb-2"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <button
        onClick={() => onSubClick(null)}
        className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap backdrop-blur-sm ${
          activeSubId === null
            ? "bg-white text-black"
            : "bg-black/40 text-white hover:bg-black/60"
        }`}
        style={{ fontFamily: "'Josefin Sans', sans-serif" }}
      >
        Toutes
      </button>
      {subcategories.map((sub) => (
        <button
          key={sub.id}
          onClick={() => onSubClick(sub.id)}
          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap backdrop-blur-sm ${
            activeSubId === sub.id
              ? "bg-white text-black"
              : "bg-black/40 text-white hover:bg-black/60"
          }`}
          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
        >
          {sub.name}
          <span className="ml-1 opacity-70">{sub.count}</span>
        </button>
      ))}
    </div>
  );
}
