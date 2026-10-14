import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import { Button } from "@/components/ui/button";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import { CGFContent } from "@/components/legal/CGFContent";
import { ConfidentialiteContent } from "@/components/legal/ConfidentialiteContent";
import { CGUContent } from "@/components/legal/CGUContent";
import { CookiesContent } from "@/components/legal/CookiesContent";
import { EnglishGeneralConditions, EnglishPrivacy, EnglishTerms, EnglishCookies } from "@/components/legal/EnglishLegalContent";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";

const IDS = ["accueil", "conditions-generales", "confidentialite", "cgu", "cookies"];
const LegalNotices = () => {
  const { language } = useLanguage();
  const en = language === "en";
  const navigate = useLocalizedNavigate();
  const [params] = useSearchParams();
  const index = Math.max(0, IDS.indexOf(params.get("section") ?? "accueil"));
  const scrollRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const on = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // Safari iOS peut différer l'autoplay malgré muted + playsInline.
  useEffect(() => {
    const retry = () => {
      const v = bgVideoRef.current;
      if (v?.paused) void v.play().catch(() => undefined);
    };
    retry();
    document.addEventListener("touchstart", retry, { passive: true, once: true });
    document.addEventListener("click", retry, { once: true });
    return () => {
      document.removeEventListener("touchstart", retry);
      document.removeEventListener("click", retry);
    };
  }, [isPortrait]);
  const labels = en
    ? ["Legal notices", "General operating conditions", "Privacy policy", "Terms of use", "Cookie policy"]
    : ["Mentions légales", "Conditions générales de fonctionnement", "Politique de confidentialité", "Conditions générales d’utilisation", "Politique de cookies"];
  const go = (next: number) => {
    if (next < 0 || next >= IDS.length) return;
    navigate(next === 0 ? "/mentions-legales" : `/mentions-legales?section=${IDS[next]}`);
  };
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [index]);
  useSEO({
    title: en ? "Legal notices — One World Morocco" : "Mentions légales — One World Morocco",
    description: en ? "General conditions, privacy, terms of use and cookies for One World Morocco." : "Conditions générales, confidentialité, conditions d’utilisation et cookies de One World Morocco.",
    canonical: "/mentions-legales",
  });
  return <div className="legal-experience relative flex h-[100dvh] min-h-[480px] flex-col overflow-hidden bg-background text-foreground">
    <video
      ref={bgVideoRef}
      key={isPortrait ? "portrait" : "landscape"}
      className="absolute inset-0 h-full w-full object-cover"
      src={isPortrait ? portraitVideoAsset.url : landscapeVideoAsset.url}
      poster={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
    <div className={index === 0 ? "legal-hero-shade absolute inset-0" : "legal-document-shade absolute inset-0"} aria-hidden="true" />
    <FrontHeader fixed solid={index > 0} onLogoClick={() => navigate("/")} />
    <main className="relative z-10 flex min-h-0 flex-1 flex-col pt-24 md:pt-28">
      {index === 0 ? <div ref={scrollRef} className="legal-enter flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-5 text-center md:px-12">
        <h1 className="max-w-3xl font-josefin text-3xl font-semibold leading-tight md:text-5xl">{en ? "Legal notices" : "Mentions légales"}</h1>
        <div className="mt-8 w-full max-w-3xl border-t border-foreground/25 pt-5">
          <nav aria-label={labels[0]} className="grid grid-cols-1 gap-x-4 gap-y-2 text-left md:grid-cols-2">
            {labels.slice(1).map((label, i) => <Button key={label} variant="link" onClick={() => go(i + 1)} className="h-auto justify-between whitespace-normal px-0 py-2 text-left text-xs text-foreground hover:text-gold md:text-sm"><span>{label}</span><ArrowUpRight /></Button>)}
          </nav>
        </div>
      </div> : <div key={`${index}-${language}`} ref={scrollRef} role="region" aria-label={labels[index]} tabIndex={0} className="legal-enter legal-text min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-8 md:px-12">
        <article className="mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-semibold uppercase text-gold">{labels[0]} · {String(index).padStart(2, "0")} / 04</p>
          {index === 1 && (en ? <EnglishGeneralConditions /> : <CGFContent />)}
          {index === 2 && (en ? <EnglishPrivacy onCookies={() => go(4)} /> : <ConfidentialiteContent />)}
          {index === 3 && (en ? <EnglishTerms /> : <CGUContent />)}
          {index === 4 && (en ? <EnglishCookies /> : <CookiesContent />)}
        </article>
      </div>}
    </main>
    <nav aria-label={en ? "Page navigation" : "Navigation des écrans"} className="relative z-10 flex shrink-0 items-center justify-center gap-8 border-t border-foreground/15 px-5 py-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Button variant="ghost" disabled={index === 0} onClick={() => go(index - 1)} className="h-auto flex-col gap-1 px-3 hover:bg-foreground/10 hover:text-gold"><ChevronUp className="text-gold" /><span className="text-xs">{en ? "Previous" : "Précédent"}</span></Button>
      <span className="min-w-10 text-center text-xs text-foreground/65" aria-live="polite">{index + 1} / 5</span>
      <Button variant="ghost" disabled={index === 4} onClick={() => go(index + 1)} className="h-auto flex-col gap-1 px-3 hover:bg-foreground/10 hover:text-gold"><ChevronDown className="text-gold" /><span className="text-xs">{en ? "Next" : "Suivant"}</span></Button>
    </nav>
  </div>;
};
export default LegalNotices;