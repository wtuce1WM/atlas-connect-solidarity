import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoHamsa from "@/assets/logo-hamsa-gold.png";

const HomeMindtripHeader = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-12 md:py-4">
        <Link to="/" aria-label="Accueil" className="flex items-center gap-2 md:gap-3" onClick={() => setMenuOpen(false)}>
          <img src={logoHamsa} alt="One World Morocco" className="h-8 w-auto md:h-9" />
          <span className="font-josefin text-xs uppercase tracking-[0.18em] text-foreground sm:text-sm sm:tracking-[0.2em]">
            ONE WORLD MOROCCO
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/corporate" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
            Ajoutez votre entreprise
          </Link>
          <Link to="/club" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
            Le club OWM
          </Link>
          <Link to="/install" className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 transition hover:text-foreground">
            Application
          </Link>
        </div>

        <button
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="text-foreground md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-background/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link to="/corporate" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
              Ajoutez votre entreprise
            </Link>
            <Link to="/club" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
              Le club OWM
            </Link>
            <Link to="/install" onClick={() => setMenuOpen(false)} className="font-josefin text-sm uppercase tracking-[0.2em] text-foreground/80 py-2">
              Application
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default HomeMindtripHeader;
