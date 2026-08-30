import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CTAS: { label: string; to: string }[] = [
  { label: "Installer l'App", to: "/install" },
  { label: "Devenez membre du club OWM", to: "/club" },
  { label: "Un concept local et solidaire", to: "/corporate" },
  { label: "Ajoutez votre entreprise", to: "/join" },
  { label: "Widgets", to: "/widgets" },
  { label: "Blog", to: "/blog" },
];

const FRONT_LANGS = [
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "en", flag: "🇬🇧", label: "English" },
] as const;

interface Props {
  /** Affiche le header en position fixed pleine largeur (overlay menu inclus). */
  fixed?: boolean;
  /** Force l'affichage même si le header parent est masqué. */
  visible?: boolean;
  /** Callback fermeture du menu (optionnel). */
  onMenuToggle?: (open: boolean) => void;
  /** Callback clic sur le logo / nom (retour écran 1). */
  onLogoClick?: () => void;
}

/**
 * Header et menu hamburger spécifique à la page `/front`.
 * Réutilisable dans `Front.tsx` et dans `FrontDemoCardsPanel`.
 */
const LogoBlock = ({
  onClick,
}: {
  onClick?: () => void;
}) => {
  const content = (
    <>
      <img
        src="/images/logo_blanc.webp"
        alt="One World Morocco"
        className="h-7 w-7 shrink-0 object-contain"
      />
      <span className="font-josefin text-xs font-black uppercase tracking-[0.2em] text-[#F4EEE4] md:text-sm">
        One World Morocco
      </span>
    </>
  );
  if (!onClick) {
    return <div className="flex items-center gap-3">{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
    >
      {content}
    </button>
  );
};

const FrontHeader = ({ fixed = false, visible = true, onMenuToggle, onLogoClick }: Props) => {
  const { language, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const setOpen = (open: boolean) => {
    setMenuOpen(open);
    onMenuToggle?.(open);
  };

  const handleLogoClick = () => {
    if (menuOpen) setOpen(false);
    onLogoClick?.();
  };

  const wrapperClass = fixed
    ? "fixed inset-x-0 top-0 z-50"
    : "absolute left-0 right-0 top-0 z-30";

  return (
    <>
      <div
        className={`${wrapperClass} flex items-center justify-between px-5 py-4 pt-safe md:px-10 transition-opacity duration-300 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!visible}
      >
        <LogoBlock onClick={handleLogoClick} />
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          onClick={() => setOpen(true)}
          className="mt-2 rounded-full border border-[rgba(244,238,228,0.2)] bg-transparent p-2.5 text-[#F4EEE4] transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Overlay menu navigation */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-md transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-5 py-4 pt-safe md:px-10">
          <LogoBlock onClick={handleLogoClick} />
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full border border-[rgba(244,238,228,0.2)] bg-transparent p-2.5 text-[#F4EEE4] transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col justify-center gap-3 px-5 pb-10 md:px-10">
          {CTAS.map((cta) => (
            <Link
              key={cta.to}
              to={cta.to}
              onClick={() => setOpen(false)}
              className="group relative overflow-hidden rounded-xl border border-[rgba(244,238,228,0.15)] bg-black/35 p-5 backdrop-blur-md transition-all hover:border-gold/60 focus-visible:border-gold/60 focus-visible:outline-none"
            >
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--gold)))",
                }}
                aria-hidden="true"
              />
              <ArrowUpRight className="absolute right-4 top-5 h-4 w-4 text-[rgba(244,238,228,0.6)] transition-colors group-hover:text-gold" />
              <span className="block pr-8 font-roboto text-base font-bold text-[#F4EEE4] md:text-lg">
                {cta.label}
              </span>
            </Link>
          ))}

          {/* Switch de langues */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            {FRONT_LANGS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                aria-label={lang.label}
                aria-current={language === lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border bg-black/35 py-3 md:py-4 backdrop-blur-md transition-all focus-visible:outline-none ${
                  language === lang.code
                    ? "border-gold/70"
                    : "border-[rgba(244,238,228,0.15)] hover:border-gold/60"
                }`}
              >
                <span className="text-2xl leading-none md:text-4xl">{lang.flag}</span>
                <span className="font-roboto text-[10px] font-bold uppercase tracking-[0.14em] text-[#F4EEE4] md:text-xs">
                  {lang.code}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default FrontHeader;
