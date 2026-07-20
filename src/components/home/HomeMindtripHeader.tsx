import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useEnglishFlag } from "@/hooks/useEnglishFlag";
import { useLanguage } from "@/contexts/LanguageContext";
import { withLangPrefix, stripLangPrefix } from "@/lib/localizedPath";

type CustomLink = { label: string; to?: string; onClick?: () => void; danger?: boolean };

interface Props {
  alwaysWhite?: boolean;
  forceHamburger?: boolean;
  customMobileLinks?: CustomLink[];
  customLinks?: CustomLink[];
}

// Header navigation labels — keep keys stable, French is authoritative.
const NAV_LABELS = {
  fr: { concept: "Le concept", join: "Rejoindre", card: "Votre carte de visite numérique", affiliate: "Devenir affilié", club: "Le club OWM", app: "Application", home: "Page d'accueil" },
  en: { concept: "The concept", join: "Join", card: "Your digital business card", affiliate: "Become an affiliate", club: "The OWM club", app: "App", home: "Home" },
  ar: { concept: "المفهوم", join: "انضم إلينا", card: "بطاقة عملك الرقمية", affiliate: "كن شريكًا", club: "نادي OWM", app: "التطبيق", home: "الصفحة الرئيسية" },
} as const;

const HomeMindtripHeader = ({ alwaysWhite = false, forceHamburger = false, customMobileLinks, customLinks }: Props) => {
  const location = useLocation();
  const { language } = useLanguage();
  const L = NAV_LABELS[language] ?? NAV_LABELS.fr;
  const cleanPath = stripLangPrefix(location.pathname);
  const isWhiteHeaderPage = cleanPath === "/" || cleanPath === "/corporate" || cleanPath === "/join" || cleanPath === "/card" || cleanPath === "/club";
  const blackHamburger = (cleanPath === "/" || cleanPath === "/install" || cleanPath === "/join" || cleanPath === "/devenir-affilie") && !isWhiteHeaderPage;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const englishEnabled = useEnglishFlag();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whiteText = alwaysWhite || scrolled || isWhiteHeaderPage;
  const logoSrc = (isWhiteHeaderPage || alwaysWhite) ? "/images/logo_blanc.webp" : "/logo-gold.webp";
  const linkClass = `font-josefin text-sm uppercase tracking-[0.2em] transition ${
    whiteText ? "text-white/85 hover:text-white" : "text-black hover:text-black/70"
  }`;

  const getNavLinks = () => {
    if (cleanPath === "/corporate") {
      return [
        { to: "/join", label: L.join },
        { to: "/card", label: L.card },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/join") {
      return [
        { to: "/corporate", label: L.concept },
        { to: "/card", label: L.card },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/card") {
      return [
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/devenir-affilie") {
      return [
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/card", label: L.card },
      ];
    } else if (cleanPath === "/club") {
      return [
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/install", label: L.app },
      ];
    } else {
      const baseLinks: { to: string; label: string }[] = [
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/club", label: L.club },
      ];
      if (cleanPath !== "/install") {
        baseLinks.push({ to: "/install", label: L.app });
      }
      return baseLinks;
    }
  };

  const getMobileLinks = () => {
    const base = [{ to: "/", label: L.home }];
    if (cleanPath === "/corporate") {
      return [
        ...base,
        { to: "/join", label: L.join },
        { to: "/card", label: L.card },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/join") {
      return [
        ...base,
        { to: "/corporate", label: L.concept },
        { to: "/card", label: L.card },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/card") {
      return [
        ...base,
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/devenir-affilie", label: L.affiliate },
      ];
    } else if (cleanPath === "/devenir-affilie") {
      return [
        ...base,
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/card", label: L.card },
      ];
    } else if (cleanPath === "/club") {
      return [
        ...base,
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/install", label: L.app },
      ];
    } else {
      const baseLinks: { to: string; label: string }[] = [
        ...base,
        { to: "/corporate", label: L.concept },
        { to: "/join", label: L.join },
        { to: "/club", label: L.club },
      ];
      if (cleanPath !== "/install") {
        baseLinks.push({ to: "/install", label: L.app });
      }
      return baseLinks;
    }
  };

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 h-10 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/10 bg-[rgba(26,18,11,0.86)] backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 md:px-12">
        <Link to={withLangPrefix("/", language)} aria-label="Accueil" className="flex items-center gap-2 md:gap-3" onClick={() => setMenuOpen(false)}>
          <img
            src={logoSrc}
            alt="One World Morocco"
            className="h-8 w-auto transition-all duration-500"
          />
          <span
            className={`font-josefin text-xs uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.22em] transition-colors ${
              whiteText ? "text-white" : "text-black"
            }`}
          >
            ONE WORLD MOROCCO
          </span>

        </Link>

        <div className={`${forceHamburger ? "hidden" : "hidden lg:flex"} items-center gap-6`}>
          {getNavLinks().map((item) => {
            const isClubCta = item.to === "/join" || item.to === "/club";
            return (
              <Link
                key={item.to}
                to={withLangPrefix(item.to, language)}
                className={linkClass}
                {...(isClubCta ? { "data-track-event": "club_cta_click", "data-track-location": "nav_top", "data-track-target": item.to.slice(1) } : {})}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center">
          <LanguageSwitcher />
        </div>


        <button
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className={`${forceHamburger ? "" : "lg:hidden"} ${
            blackHamburger && !scrolled ? "text-black" : "text-white"
          }`}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className={`${forceHamburger ? "" : "lg:hidden"} px-4 pt-3 pb-4`}>
          <div className="flex flex-col gap-2 rounded-2xl p-3 bg-black/60 backdrop-blur-2xl backdrop-saturate-150 border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)]">
            {customMobileLinks && customMobileLinks.length > 0 ? (
              customMobileLinks.map((item, idx) => {
                const baseClass = `rounded-xl px-4 py-3 font-josefin text-sm uppercase tracking-[0.2em] border backdrop-blur-xl transition-all text-left ${
                  item.danger
                    ? "text-white hover:text-white bg-red-500/20 border-red-400/40 hover:bg-red-500/30"
                    : "text-white hover:text-white bg-white/5 border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/15"
                }`;
                if (item.to) {
                  return (
                    <Link key={`${item.label}-${idx}`} to={withLangPrefix(item.to, language)} onClick={() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: "auto" }); }} className={baseClass}>
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={`${item.label}-${idx}`}
                    type="button"
                    onClick={() => { setMenuOpen(false); item.onClick?.(); }}
                    className={baseClass}
                  >
                    {item.label}
                  </button>
                );
              })
            ) : (
              getMobileLinks()
                .filter((item) => item.to !== cleanPath)
                .map((item) => (
                  <Link
                    key={item.to}
                    to={withLangPrefix(item.to, language)}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 font-josefin text-sm uppercase tracking-[0.2em] text-white/90 bg-white/5 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl transition-all hover:bg-white/15 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))
            )}
            <div className="mt-1 flex justify-center pt-2 border-t border-white/10">
              <LanguageSwitcher />
            </div>

          </div>
        </div>
      )}

    </nav>
  );
};

export default HomeMindtripHeader;
