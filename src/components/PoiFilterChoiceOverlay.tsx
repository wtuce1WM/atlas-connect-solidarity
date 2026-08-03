import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PoiFilterChoiceItem {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface Props {
  /** Breadcrumb root label (ex: "Points d'intérêt" / "Catégories") */
  title: string;
  items: PoiFilterChoiceItem[];
  selectedKey?: string | null;
  /** Label of the reset entry (ex: "Tous" / "Toutes les catégories") */
  allLabel?: string;
  onSelect: (key: string) => void;
  onSelectAll?: () => void;
  onClose: () => void;
  zClass?: string;
}

/**
 * Overlay de sélection identique à l'overlay Filtres de /search :
 * fond Koutoubia, bouton X, fil d'Ariane, badges liquid-glass centrés.
 */
export default function PoiFilterChoiceOverlay({
  title,
  items,
  selectedKey,
  allLabel,
  onSelect,
  onSelectAll,
  onClose,
  zClass = "z-[250]",
}: Props) {
  const { language } = useLanguage();
  const closeLabel = language === "en" ? "Close filters" : language === "ar" ? "إغلاق الفلاتر" : "Fermer les filtres";

  const badgeBase =
    "relative inline-flex items-center gap-2 rounded-full border-2 border-black px-3 py-1.5 text-xs md:px-5 md:py-2.5 md:text-base font-semibold transition-all overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),inset_0_-1px_2px_0_rgba(255,255,255,0.25),0_4px_16px_-4px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/50 before:via-white/10 before:to-white/30 before:pointer-events-none [&>*]:relative [&>*]:z-10";
  const badgeIdle = "bg-white/40 text-black hover:bg-white/50";
  const badgeSelected = "bg-black/80 text-white hover:bg-black/90";

  const selectedItem = selectedKey ? items.find((i) => i.key === selectedKey) || null : null;

  return (
    <div
      dir="ltr"
      className={`fixed inset-0 ${zClass} flex flex-col bg-black/10 backdrop-blur-sm animate-slide-up-from-bottom lg:left-1/2`}
    >
      <div className="h-full flex flex-col">
        <div className="relative z-20 shrink-0 flex items-center px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black hover:bg-black/90 flex items-center justify-center text-white cursor-pointer touch-manipulation"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label={closeLabel}
          >
            <X className="h-4 w-4 pointer-events-none" />
          </button>
          <nav
            className="flex-1 min-w-0 px-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-white"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
            aria-label="Fil d'Ariane"
          >
            <span className={`truncate ${selectedItem ? "opacity-60" : "opacity-100"}`}>{title}</span>
            {selectedItem && (
              <>
                <span aria-hidden="true" className="opacity-50">/</span>
                <span className="truncate">{selectedItem.label}</span>
              </>
            )}
          </nav>
          <span className="w-9 h-9 shrink-0" aria-hidden="true" />
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-10 pt-2">
          <div className="flex flex-col items-center gap-4">
            {selectedKey && allLabel && onSelectAll && (
              <button
                type="button"
                onClick={onSelectAll}
                className={`${badgeBase} ${badgeIdle}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <span>{allLabel}</span>
              </button>
            )}
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => { if (!item.disabled) onSelect(item.key); }}
                className={`${badgeBase} ${item.key === selectedKey ? badgeSelected : badgeIdle} ${item.disabled ? "opacity-40 pointer-events-none" : ""}`}
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                <span>{item.label}</span>
                {item.count != null && <span className="text-xs font-normal opacity-70">({item.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
