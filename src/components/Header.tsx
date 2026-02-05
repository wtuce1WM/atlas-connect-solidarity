import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import logoGold from "@/assets/logoGOLD.webp";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    t
  } = useLanguage();
  return <header className="fixed left-0 right-0 top-0 z-50 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <img src={logoGold} alt="WTUCEMA Logo" className="h-10 w-10 object-contain" />
          <span className="font-serif text-xl font-bold"><span className="text-gold">ONE WORLD</span> <span className="text-white">MOROCCO</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#about" className="text-white/90 transition-colors hover:text-gold">
            {t("nav.about")}
          </a>
          <a href="#contact" className="text-white/90 transition-colors hover:text-gold">
            {t("nav.contact")}
          </a>
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <LanguageSwitcher />
          <button className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-white transition-all hover:border-gold hover:text-gold">
            <User className="h-4 w-4" />
            {t("nav.signIn")}
          </button>
          <button className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground transition-all hover:bg-gold/90">
            {t("nav.joinNow")}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="text-white md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && <div className="border-t border-white/10 bg-black/90 backdrop-blur-lg md:hidden">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-6">
            <a href="#about" className="text-white/90 transition-colors hover:text-gold">
              {t("nav.about")}
            </a>
            <a href="#contact" className="text-white/90 transition-colors hover:text-gold">
              {t("nav.contact")}
            </a>
            <hr className="border-white/20" />
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>
            <button className="flex items-center justify-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-white">
              <User className="h-4 w-4" />
              {t("nav.signIn")}
            </button>
            <button className="rounded-lg bg-gold px-4 py-2 font-semibold text-gold-foreground">
              {t("nav.joinNow")}
            </button>
          </nav>
        </div>}
    </header>;
};
export default Header;