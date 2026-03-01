import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco" | "city";
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen]);

  const headerBg = variant === "morocco"
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm"
    : variant === "city"
      ? "bg-transparent"
      : "bg-background";

  const textColor = "text-black";
  const logoSecondary = "text-black";

  return (
    <header ref={headerRef} className={`fixed left-0 right-0 top-0 z-50 ${headerBg}`}>
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <img src={logoGold} alt="WTUCEMA Logo" className="h-9 w-9 object-contain" />
          <span className="hidden sm:inline text-lg font-bold tracking-tight">
            <span className="text-gold">ONE WORLD</span>{" "}
            <span className={logoSecondary}>MOROCCO</span>
          </span>
        </a>

        {/* Menu Button */}
        <button className={`shrink-0 ${textColor}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div
          className="border-t border-border border-b border-b-foreground backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(to bottom, hsl(var(--background) / 0.45), hsl(var(--background) / 0.06))",
          }}
        >
          <nav className="container mx-auto flex flex-col items-center gap-4 px-4 py-6">
            <Link to="/mission" className="text-foreground transition-colors hover:text-gold">
              {t("footer.ourMission")}
            </Link>
            <Link to="/search" className="text-foreground transition-colors hover:text-gold">
              Recherche
            </Link>
            <Link to="/hotels" className="text-foreground transition-colors hover:text-gold">
              Hôtels
            </Link>
            <Link to="/contact" className="text-foreground transition-colors hover:text-gold">
              {t("footer.contact")}
            </Link>
            <hr className="w-full border-border" />
            <Link to="/devenir-affilie" className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
              {t("nav.joinNow")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
