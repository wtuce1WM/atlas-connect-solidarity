import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoHamsa from "@/assets/logo-hamsa-gold.png";

interface Props {
  alwaysWhite?: boolean;
}

const HomeMindtripHeader = ({ alwaysWhite = false }: Props) => {
  const location = useLocation();
  const blackHamburger = location.pathname === "/" || location.pathname === "/install";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whiteText = alwaysWhite || scrolled;
  const linkClass = `font-josefin text-sm uppercase tracking-[0.2em] transition ${
    whiteText ? "text-white/85 hover:text-white" : "text-black hover:text-black/70"
  }`;


  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/10 bg-[rgba(26,18,11,0.86)] backdrop-blur-md py-2"
          : "bg-transparent py-2"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 md:px-12">
        <Link to="/" aria-label="Accueil" className="flex items-center gap-2 md:gap-3" onClick={() => setMenuOpen(false)}>
          <img
            src={logoHamsa}
            alt="One World Morocco"
            className={`w-auto transition-all duration-500 ${scrolled ? "h-8 md:h-9" : "h-10 md:h-11"} drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]`}
          />
          <span
            className={`font-josefin text-xs uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em] transition-colors ${
              whiteText ? "text-white" : "text-black"
            }`}
          >
            ONE WORLD MOROCCO
          </span>

        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/corporate" className={linkClass}>Ajoutez votre entreprise</Link>
          <Link to="/club" className={linkClass}>Le club OWM</Link>
          <Link to="/install" className={linkClass}>Application</Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className={`md:hidden drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
            blackHamburger && !scrolled ? "text-black" : "text-white"
          }`}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-black/30 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link to="/corporate" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-white/85 py-2">
              Ajoutez votre entreprise
            </Link>
            <Link to="/club" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-white/85 py-2">
              Le club OWM
            </Link>
            <Link to="/install" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-white/85 py-2">
              Application
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HomeMindtripHeader;
