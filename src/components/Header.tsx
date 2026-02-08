import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco";
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    t
  } = useLanguage();

  const headerBg = variant === "morocco" 
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm" 
    : "bg-black/80 backdrop-blur-md";

  return <header className={`fixed left-0 right-0 top-0 z-50 ${headerBg}`}>
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <img src={logoGold} alt="WTUCEMA Logo" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold tracking-tight"><span className="text-gold">ONE WORLD</span> <span className="text-white">MOROCCO</span>
          </span>
        </a>

        {/* Menu Button - All screen sizes */}
        <button className="text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Dropdown Menu - All screen sizes */}
      {isMenuOpen && <div className="border-t border-white/10 bg-black/90 backdrop-blur-lg">
          <nav className="container mx-auto flex flex-col items-center gap-4 px-4 py-6">
            <a href="/#mission" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.ourMission")}
            </a>
            <a href="/#contact" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.contact")}
            </a>
            <hr className="w-full border-white/20" />
            <button className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
              {t("nav.joinNow")}
            </button>
          </nav>
        </div>}
    </header>;
};
export default Header;