import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Menu, X } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco" | "city";
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerBg = variant === "morocco"
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm"
    : variant === "city"
      ? "bg-transparent"
      : "bg-white";

  const navLinks = (
    <>
      <Link to="/mission" className="text-foreground text-sm font-semibold transition-colors hover:text-gold" onClick={() => setMobileOpen(false)}>
        {t("footer.ourMission")}
      </Link>
      <Link to="/contact" className="text-foreground text-sm font-semibold transition-colors hover:text-gold" onClick={() => setMobileOpen(false)}>
        {t("footer.contact")}
      </Link>
      <Link to="/devenir-affilie" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-colors hover:bg-gold/90" onClick={() => setMobileOpen(false)}>
        {t("nav.joinNow")}
      </Link>
    </>
  );

  return (
    <header className={`fixed left-0 right-0 top-0 z-30 ${headerBg}`}>
      <div className="mx-auto flex items-center justify-between px-4 py-3 lg:w-1/2 lg:mr-auto lg:ml-0">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 rounded-lg text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <a href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Josefin Sans', sans-serif", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              <span className="text-foreground">ONE WORLD</span>{" "}
              <span className="text-foreground">MOROCCO</span>
            </span>
          </a>
        </div>

        {/* Desktop inline nav removed — use hamburger on all devices */}
      </div>

      {/* Dropdown menu — full height left panel on desktop */}
      {mobileOpen && (
        <>
          {/* Mobile/Tablet: simple dropdown */}
          <div className="lg:hidden border-t border-border bg-white animate-in slide-in-from-top-2 fade-in duration-150">
            <nav className="flex flex-col gap-4 px-6 py-5">
              {navLinks}
            </nav>
          </div>
          {/* Desktop: full-height left 50% overlay */}
          <div className="hidden lg:flex fixed inset-0 top-[53px] z-[29]" onClick={() => setMobileOpen(false)}>
            <div className="w-1/2 bg-white border-r border-border shadow-xl animate-in slide-in-from-left-2 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
              <nav className="flex flex-col gap-4 px-6 py-5">
                {navLinks}
              </nav>
            </div>
            <div className="w-1/2 bg-black/20" />
          </div>
        </>
      )}
    </header>
  );
};

export default Header;