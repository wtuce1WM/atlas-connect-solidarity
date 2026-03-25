import { UtensilsCrossed, ExternalLink } from "lucide-react";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";
import DynamicIcon from "@/components/DynamicIcon";

interface MenuDoc {
  id: string;
  name: string | null;
  url: string;
  language: string | null;
  icon: string | null;
}

interface MenuUrlCardProps {
  menus: MenuDoc[];
  language: string;
  animationDelay?: string;
  tallHeight?: boolean;
  onOpenUrl: (url: string, title?: string) => void;
}

const MenuUrlCard = ({ menus, language, animationDelay = "0ms", tallHeight, onOpenUrl }: MenuUrlCardProps) => {
  if (menus.length === 0) return null;

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

      <div className="space-y-2">
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpenUrl(m.url, m.name || (language === "en" ? "Menu" : "La Carte"))}
            className="w-full flex flex-col items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors px-3 py-3 text-center"
          >
            <div className="flex items-center gap-2">
              {m.icon ? (
                <DynamicIcon name={m.icon} className="h-5 w-5 text-gold" size={20} />
              ) : (
                <UtensilsCrossed className="h-5 w-5 text-gold" />
              )}
              {m.language && (
                <img
                  src={getLangFlag(m.language)}
                  alt={getLangAlt(m.language)}
                  className="h-4 w-5 rounded-sm object-cover shrink-0"
                />
              )}
              <ExternalLink className="h-3.5 w-3.5 text-white/50 shrink-0" />
            </div>
            <span className="text-xs text-white/80 truncate max-w-full" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              {m.name || (language === "en" ? "View menu" : "Voir la carte")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuUrlCard;
export type { MenuDoc };
