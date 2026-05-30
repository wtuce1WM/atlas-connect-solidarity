import { UtensilsCrossed, ExternalLink } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
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
  type?: string | null;
}

interface MenuUrlCardProps {
  menus: MenuDoc[];
  language: string;
  animationDelay?: string;
  tallHeight?: boolean;
  categoryIcon?: string | null;
  onOpenUrl: (url: string, title?: string) => void;
}

const MenuUrlCard = ({ menus, language, animationDelay = "0ms", tallHeight, categoryIcon, onOpenUrl }: MenuUrlCardProps) => {
  if (menus.length === 0) return null;

  return (
    <div
      className={`snap-start shrink-0 w-fit ${tallHeight ? 'h-[21.6em] md:h-[28.8em]' : 'max-h-[12.6em]'} mb-4 rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 p-4 text-white overflow-hidden animate-slide-in-left opacity-0`}
      style={{ animationDelay, animationFillMode: "forwards" }}
    >
      <div className="flex items-center gap-2 mb-3">
        {categoryIcon ? (
          <DynamicIcon name={categoryIcon} className="h-4 w-4 text-gold" fallback={<UtensilsCrossed className="h-4 w-4 text-gold" />} />
        ) : (
          <UtensilsCrossed className="h-4 w-4 text-gold" />
        )}
        <h3
          className="text-sm font-bold uppercase tracking-wide"
          style={{ fontFamily: "'Josefin Sans', sans-serif" }}
        >
          {language === "en" ? "Menu" : language === "ar" ? "القائمة" : "La Carte"}
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => onOpenUrl(m.url, m.name || (language === "en" ? "Menu" : "La Carte"))}
            className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors px-4 py-3"
          >
            <span className="text-xs text-white/90 text-center normal-case" style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '0.02em', textTransform: 'none' }}>
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
