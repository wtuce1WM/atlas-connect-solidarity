import { UtensilsCrossed, ExternalLink } from "lucide-react";
import { getLangFlag, getLangAlt } from "@/lib/languageFlags";

const DOC_ICON_MAP: Record<string, string> = {
  icon_menu: "icon_menu.png",
  icon_wine: "icon_wine.png",
  icon_cocktails: "icon_cocktails.avif",
  icon_cocktails2: "icon_cocktails2.png",
};

const getDocIconSrc = (icon: string) =>
  `/images/doc-icons/${DOC_ICON_MAP[icon] || "icon_menu.png"}`;

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
            className="w-full flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors px-3 py-2.5 text-left"
          >
            <img src={getDocIconSrc(m.icon || "icon_menu")} alt="" className="h-5 w-5 object-contain shrink-0" />
            {m.language && (
              <span className="text-sm shrink-0" title={getLangAlt(m.language)}>
                {getLangFlag(m.language)}
              </span>
            )}
            <span className="text-sm text-white/90 truncate flex-1" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              {m.name || (language === "en" ? "View menu" : "Voir la carte")}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-white/50 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuUrlCard;
export type { MenuDoc };
