import { useState } from "react";
import { Menu, X, Search, Mic, MicOff, Loader } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useToast } from "@/hooks/use-toast";
import logoGold from "@/assets/logoGOLDsimpleSML.webp";

interface HeaderProps {
  variant?: "default" | "morocco" | "city";
}

const Header = ({ variant = "default" }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  const { status: voiceStatus, toggleRecording } = useVoiceSearch({
    onTranscript: (text) => {
      setSearchValue(text);
      if (text.trim()) navigate(`/search?q=${encodeURIComponent(text.trim())}`);
    },
    onError: (message) => {
      toast({ variant: "destructive", title: "Erreur microphone", description: message });
    },
  });

  const headerBg = variant === "morocco"
    ? "bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm"
    : variant === "city"
      ? "bg-transparent"
      : "bg-black backdrop-blur-md";

  const textColor = variant === "city" ? "text-black" : "text-white";
  const logoSecondary = variant === "city" ? "text-black" : "text-white";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const micIcon = voiceStatus === "processing"
    ? <Loader className="h-4 w-4 animate-spin text-gold" />
    : voiceStatus === "recording"
      ? <MicOff className="h-4 w-4 text-destructive" />
      : <Mic className="h-4 w-4 text-white/50 hover:text-gold transition-colors" />;

  return (
    <header className={`fixed left-0 right-0 top-0 z-50 ${headerBg}`}>
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
        <div className="border-t border-white/10 bg-black/90 backdrop-blur-lg">
          <nav className="container mx-auto flex flex-col items-center gap-4 px-4 py-6">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="w-full max-w-sm">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Rechercher un établissement..."
                  className="w-full bg-white/10 border border-white/20 rounded-full pl-9 pr-10 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-gold/60 focus:bg-white/15 transition-all"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={voiceStatus === "processing"}
                  className={`absolute right-2 p-1 rounded-full transition-all ${
                    voiceStatus === "recording" ? "animate-pulse" : ""
                  }`}
                  title={voiceStatus === "recording" ? "Arrêter l'enregistrement" : "Recherche vocale"}
                >
                  {micIcon}
                </button>
              </div>
            </form>
            <hr className="w-full border-white/20" />
            <Link to="/mission" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.ourMission")}
            </Link>
            <Link to="/contact" className="text-white/90 transition-colors hover:text-gold">
              {t("footer.contact")}
            </Link>
            <hr className="w-full border-white/20" />
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
