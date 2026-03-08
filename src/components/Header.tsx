import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco" | "city";
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const { t } = useLanguage();

  const headerBg = variant === "morocco"
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm"
    : variant === "city"
      ? "bg-transparent"
      : "bg-white";

  return (
    <header className={`fixed left-0 right-0 top-0 z-30 ${headerBg}`}>
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight">
          <span className="hidden sm:inline text-lg font-bold tracking-tight">
            <span className="text-foreground">ONE WORLD</span>{" "}
            <span className="text-foreground">MOROCCO</span>
          </span>
        </a>

        {/* Nav links */}
        <nav className="flex items-center gap-6">
          <Link to="/mission" className="text-foreground text-sm font-semibold transition-colors hover:text-gold">
            {t("footer.ourMission")}
          </Link>
          <Link to="/contact" className="text-foreground text-sm font-semibold transition-colors hover:text-gold">
            {t("footer.contact")}
          </Link>
          <Link to="/devenir-affilie" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground transition-colors hover:bg-gold/90">
            {t("nav.joinNow")}
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;