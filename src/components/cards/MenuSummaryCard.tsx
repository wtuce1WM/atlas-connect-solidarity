import { UtensilsCrossed } from "lucide-react";

interface MenuSummary {
  id: string;
  title: string | null;
  content: string | null;
  price_details: string | null;
  avg_price_range: unknown;
}

interface MenuSummaryCardProps {
  summaries: MenuSummary[];
  language: string;
  animationDelay?: string;
  tallHeight?: boolean;
}

const MenuSummaryCard = ({ summaries, language, animationDelay = "0ms", tallHeight }: MenuSummaryCardProps) => {
  if (summaries.length === 0) return null;

  return (
    <div
      className={`snap-start shrink-0 w-[20rem] md:w-[30rem] ${tallHeight ? 'h-[21.6em] md:h-[28.8em]' : 'h-[18em] md:h-[24em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 p-4 text-white overflow-y-auto animate-slide-in-left opacity-0`}
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <UtensilsCrossed className="h-4 w-4 text-gold" />
        <h3
          className="text-sm font-bold uppercase tracking-wide"
          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
        >
          {language === "en" ? "Menu" : language === "ar" ? "القائمة" : "La Carte"}
        </h3>
      </div>

      <div className="space-y-4">
        {summaries.map((s) => (
          <div key={s.id} className="space-y-1.5">
            {s.title && (
              <h4
                className="text-sm font-semibold text-white/95"
                style={{ fontFamily: "'Josefin Sans', sans-serif" }}
              >
                {s.title}
              </h4>
            )}
            {s.content && (
              <p className="text-sm leading-relaxed text-white/80 font-['Roboto',sans-serif]">
                {s.content}
              </p>
            )}
            {s.price_details && (
              <p className="text-xs text-gold/90 font-medium mt-1">
                {s.price_details}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuSummaryCard;
export type { MenuSummary };
