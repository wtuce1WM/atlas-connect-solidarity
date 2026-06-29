import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, Smartphone, Monitor, Share, Plus, MoreVertical, Download, Check } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { resolveHomepageCity } from "@/lib/cityHomepage";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import { useIsMobile } from "@/hooks/use-mobile";
import appIconHamsaAsset from "@/assets/app-icon-hamsa-250-rounded.webp.asset.json";

const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = zelligeBrunAsset.url;

type Platform = "ios" | "android" | "mac" | "windows";

/**
 * When launched as installed PWA (standalone), redirect to /test?city=<resolved>
 * using geolocation (Essaouira if within 80km, else Marrakech).
 * Falls back gracefully if geolocation is denied or unavailable.
 */
const redirectStandaloneToHome = () => {
  const go = (city: string) => {
    window.location.replace(`/test?city=${encodeURIComponent(city)}&entry=__home__`);
  };
  if (!navigator.geolocation) {
    go(resolveHomepageCity(null));
    return;
  }
  let done = false;
  const timeout = setTimeout(() => {
    if (done) return;
    done = true;
    go(resolveHomepageCity(null));
  }, 2500);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      go(resolveHomepageCity({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
    },
    () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      go(resolveHomepageCity(null));
    },
    { timeout: 2000, maximumAge: 5 * 60 * 1000 }
  );
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithInstallPrompt = typeof window & {
  __owmInstallPromptEvent?: BeforeInstallPromptEvent;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/i.test(ua)) return "mac";
  return "windows";
};

const Install = () => {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const guideRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = "Installer l'app — ONE WORLD MOROCCO";

    // Mark as installed if in standalone mode, but stay on this page
    // (the user explicitly navigated here from the footer link)
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
    if (isStandalone) {
      setInstalled(true);
    }

    const readCapturedInstallPrompt = () => {
      const capturedEvent = (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
      if (capturedEvent) setInstallEvent(capturedEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setInstallEvent(null);
      delete (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
    };

    readCapturedInstallPrompt();
    window.addEventListener("owm-installprompt-ready", readCapturedInstallPrompt);
    window.addEventListener("appinstalled", installedHandler);

    // Detect outdated version: if a Service Worker has a waiting/installed update,
    // invite the user to refresh.
    let cleanupSw: (() => void) | undefined;
    if ("serviceWorker" in navigator) {
      const trackWorker = (worker: ServiceWorker | null) => {
        if (!worker) return;
        const onStateChange = () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        };
        worker.addEventListener("statechange", onStateChange);
      };
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
        trackWorker(reg.installing);
        const onUpdateFound = () => trackWorker(reg.installing);
        reg.addEventListener("updatefound", onUpdateFound);
        cleanupSw = () => reg.removeEventListener("updatefound", onUpdateFound);
        // Ask the browser to check for an update immediately.
        reg.update().catch(() => {});
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener("owm-installprompt-ready", readCapturedInstallPrompt);
      window.removeEventListener("appinstalled", installedHandler);
      cleanupSw?.();
    };
  }, []);

  const handleIconClick = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      import("@/lib/analytics").then(({ trackEvent }) =>
        trackEvent("pwa_install_outcome", { outcome })
      ).catch(() => {});
      if (outcome === "accepted") {
        setInstalled(true);
        setInstallEvent(null);
        delete (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
      }
      return;
    }
    // Fallback or installed: scroll to platform-specific guide
    guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs: { id: Platform; label: string; Icon: React.ComponentType<{ className?: string }> }[] = useMemo(
    () => [
      { id: "ios", label: "iPhone / iPad", Icon: Apple },
      { id: "android", label: "Android", Icon: Smartphone },
      { id: "mac", label: "Mac", Icon: Apple },
      { id: "windows", label: "Windows", Icon: Monitor },
    ],
    []
  );

  const guides: Record<Platform, { title: string; steps: { icon: JSX.Element; text: React.ReactNode }[]; note?: string }> = {
    ios: {
      title: "Installer sur iPhone / iPad",
      steps: [
        { icon: <Apple className="h-5 w-5 text-[#C04F17]" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (obligatoire, ne fonctionne pas dans Chrome iOS).</> },
        { icon: <Share className="h-5 w-5 text-[#C04F17]" />, text: <>Touche le bouton <strong>Partager</strong> en bas de l'écran (carré avec une flèche vers le haut).</> },
        { icon: <Plus className="h-5 w-5 text-[#C04F17]" />, text: <>Dans le menu Partager, <strong>fais défiler vers le bas</strong> dans la liste des actions (sous la rangée d'icônes d'apps), puis choisis <strong>« Sur l'écran d'accueil »</strong> (ou <strong>« Ajouter à l'écran d'accueil »</strong>).</> },
        { icon: <Check className="h-5 w-5 text-[#C04F17]" />, text: <>Touche <strong>Ajouter</strong> en haut à droite. L'icône OW Morocco apparaît sur ton écran d'accueil.</> },
      ],
      note: "Tu ne vois pas « Sur l'écran d'accueil » ? 1) Vérifie que tu es bien dans Safari (pas Chrome ni Instagram/Facebook in-app) — sinon copie le lien et ouvre-le dans Safari. 2) Dans le menu Partager, l'option est plus bas dans la liste : fais défiler. 3) Si elle n'apparaît toujours pas, touche « Modifier les actions » tout en bas et active « Sur l'écran d'accueil ». 4) Sur iOS en mode navigation privée, l'option est masquée — quitte la navigation privée.",
    },
    android: {
      title: "Installer sur Android",
      steps: [
        { icon: <Smartphone className="h-5 w-5 text-[#C04F17]" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong> (obligatoire — n'utilise pas Samsung Internet ni Firefox, sinon Google Play Protect peut bloquer l'installation).</> },
        { icon: <MoreVertical className="h-5 w-5 text-[#C04F17]" />, text: <>Touche le menu <strong>⋮</strong> en haut à droite.</> },
        { icon: <Download className="h-5 w-5 text-[#C04F17]" />, text: <>Choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</> },
        { icon: <Check className="h-5 w-5 text-[#C04F17]" />, text: <>Confirme. L'icône OW Morocco s'installe comme une vraie app.</> },
      ],
      note: "Si Google Play Protect affiche « Appli non sécurisée bloquée », c'est que l'installation s'est faite via Samsung Internet ou Firefox. Touche « Plus de détails » puis « Installer quand même », ou réinstalle depuis Chrome pour éviter le message.",
    },
    mac: {
      title: "Installer sur Mac",
      steps: [
        { icon: <Monitor className="h-5 w-5 text-[#C04F17]" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (macOS Sonoma+) ou <strong>Chrome</strong>.</> },
        { icon: <Download className="h-5 w-5 text-[#C04F17]" />, text: <><strong>Safari :</strong> menu <strong>Fichier → Ajouter au Dock…</strong><br /><strong>Chrome :</strong> menu <strong>Fichier → Installer ONE WORLD MOROCCO…</strong> (ou icône ⊕ dans la barre d'adresse).</> },
        { icon: <Check className="h-5 w-5 text-[#C04F17]" />, text: <>L'app s'ouvre dans sa propre fenêtre, sans barre d'adresse, et apparaît dans le Dock et le Launchpad.</> },
      ],
      note: "Dans Chrome, tu peux glisser l'icône depuis Launchpad vers le Dock pour l'épingler.",
    },
    windows: {
      title: "Installer sur Windows",
      steps: [
        { icon: <Monitor className="h-5 w-5 text-[#C04F17]" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong> ou <strong>Edge</strong>.</> },
        { icon: <Download className="h-5 w-5 text-[#C04F17]" />, text: <>Clique sur l'icône <strong>⊕ Installer</strong> à droite de la barre d'adresse (ou menu <strong>⋮ → Installer ONE WORLD MOROCCO</strong>).</> },
        { icon: <Check className="h-5 w-5 text-[#C04F17]" />, text: <>Confirme. L'app s'épingle au menu Démarrer et à la barre des tâches.</> },
      ],
    },
  };

  const guide = guides[platform];

  return (
    <>
    <main className="min-h-dvh bg-background text-foreground">
      <HomeMindtripHeader alwaysWhite />

      {/* Hero — repris de la home : picture mobile/tablette/desktop + mockups flottants */}
      <div>
        <section className="relative min-h-[92vh] w-full overflow-hidden">
          <picture>
            <source media="(max-width: 767px)" srcSet={heroImageMobile} />
            <source media="(max-width: 1023px)" srcSet={heroImageTablet} />
            <img
              src={heroImageDesktop}
              alt="Maroc — riad, piscine et tagine, composition réalisme magique"
              className="absolute inset-0 h-full w-full object-cover will-change-transform lg:h-[120%]"
              loading="eager"
              fetchPriority="high"
            />
          </picture>
          {/* Dark overlay on tablet to ensure text readability over zellige pattern */}
          <div className="hidden md:block lg:hidden absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10" />
          <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-black/85 via-black/45 to-transparent md:hidden z-10" />

          {/* Floating phone mockup — left side, desktop only */}
          <img
            src={phoneMockupAsset.url}
            alt="Application One World Morocco sur iPhone"
            aria-hidden="true"
            className="hidden lg:block pointer-events-none select-none absolute left-[2%] xl:left-[5%] top-1/2 -translate-y-1/2 h-[64%] w-auto z-20 drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] animate-[heroPhoneFloat_6s_ease-in-out_infinite]"
          />
          {/* Floating iPhone mockup — right side, tablet only (768px to 1023px) */}
          <img
            src={iphoneTabletMockupAsset.url}
            alt="Application One World Morocco — Koutoubia"
            aria-hidden="true"
            className="hidden md:block lg:hidden pointer-events-none select-none absolute right-[3%] top-1/2 -translate-y-1/2 md:max-lg:top-[38%] md:max-lg:h-[48%] w-auto z-20 drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] animate-[heroPhoneFloat_4.5s_ease-in-out_infinite]"
          />
          {/* Centered iPhone mockup — mobile only */}
          <img
            src={phoneMockupAsset.url}
            alt="Application One World Morocco sur iPhone"
            aria-hidden="true"
            className="block md:hidden pointer-events-none select-none absolute top-[10%] left-0 right-0 h-[85%] w-full object-contain object-bottom origin-top scale-[0.95] z-10 opacity-85 animate-[mobilePhoneFloat_5s_ease-in-out_infinite]"
          />
          <style>{`
            @keyframes heroPhoneFloat {
              0%, 100% { transform: translateY(calc(-50% - 8px)); }
              50% { transform: translateY(calc(-50% + 8px)); }
            }
            @keyframes mobilePhoneFloat {
              0%, 100% { transform: scale(0.95) translateY(0); }
              50% { transform: scale(0.95) translateY(-12px); }
            }
            @media (prefers-reduced-motion: reduce) {
              section img[alt^="Application One World"] { animation: none !important; }
            }
          `}</style>

          <div className="relative z-20 mx-auto flex min-h-[92vh] max-w-7xl flex-col items-center max-md:justify-start max-md:pt-[140px] pb-28 text-center px-6 md:justify-center md:items-start lg:items-center md:text-left lg:text-center md:pt-24 md:pb-6 md:py-24 md:px-12 w-full">
            <div className="w-full md:max-lg:max-w-[75%] md:max-lg:mb-6">
              {/* Mobile Title */}
              <h1 style={{ lineHeight: 1.2 }} className="md:hidden font-josefin text-[1.625rem] sm:text-4xl font-bold tracking-tight text-white max-w-3xl mx-auto text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
                Installer l'App
              </h1>
              {/* Desktop/Tablet Title */}
              <h1 style={{ lineHeight: 1.2 }} className="hidden md:block font-josefin md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] mb-2">
                Installer l'App
              </h1>

              <p className="mt-6 md:mt-2 max-w-2xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center font-roboto text-base font-normal text-white md:text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                {installEvent
                  ? "Touche l'icône ci-dessous pour installer l'app en un clic, ou suis les étapes ci-dessous."
                  : "Installe l'app sur ton appareil pour un accès en un clic, sans barre d'adresse, avec l'icône directement sur ton écran d'accueil ou ton bureau."}
              </p>
            </div>

            {/* Install CTA container — équivalent au search container de la home */}
            <div className="max-md:mt-auto max-md:pt-10 mt-10 w-full max-w-2xl md:max-lg:mt-6 md:max-lg:mx-0 mx-auto md:max-lg:p-6 md:max-lg:bg-white/[0.08] md:max-lg:backdrop-blur-2xl md:max-lg:border md:max-lg:border-white/20 md:max-lg:rounded-3xl md:max-lg:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_20px_60px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col items-center gap-5">
                <div
                  className="relative group overflow-hidden rounded-[1.25rem] w-20 h-20 md:w-24 md:h-24 block border border-white/35 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 bg-white/5 backdrop-blur-[2px] btn-shimmer cursor-pointer"
                  onClick={handleIconClick}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/15 z-10 pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-[1.25rem] pointer-events-none z-10" />
                  <img
                    src={appIconHamsaAsset.url}
                    alt="ONE WORLD MOROCCO"
                    className="w-full h-full object-cover relative z-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIconClick}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C04F17] text-white text-sm font-roboto font-medium shadow-lg hover:opacity-95 transition-all active:scale-95 cursor-pointer btn-shimmer"
                  aria-label={
                    installed
                      ? "Application déjà installée"
                      : installEvent
                        ? "Installer l'application maintenant"
                        : "Voir les instructions d'installation"
                  }
                >
                  {!installed ? (
                    <>
                      <Download className="h-4 w-4" />
                      {installEvent ? "Installer" : updateAvailable ? "Installer mise à jour" : "Comment installer"}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Installée
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>


      <div className="mx-auto max-w-2xl px-6 pt-10 pb-12">


        {/* Platform tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const isActive = platform === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPlatform(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-roboto font-bold transition-all ${
                  isActive
                    ? "bg-[#C04F17] text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <tab.Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#C04F17]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Guide card */}
        <section ref={guideRef} className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm scroll-mt-6">
          <h2 className="font-josefin text-xl md:text-2xl font-light mb-6 text-center">
            {guide.title}
          </h2>

          <ol className="space-y-5">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-gold/10 text-gold border border-gold/20">
                  {step.icon}
                </div>
                <div className="flex-1 pt-1.5">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-semibold mr-2">
                    {i + 1}
                  </span>
                  <span className="font-roboto text-foreground/90 leading-relaxed">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>

          {guide.note && (
            <p className="mt-6 pt-5 border-t border-border text-sm text-muted-foreground italic font-roboto">
              💡 {guide.note}
            </p>
          )}
        </section>

        {/* Update available banner — shown only when an outdated version is detected */}
        {updateAvailable && (
          <div className="mt-10 rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center">
            <p className="font-roboto text-sm text-foreground">
              <strong>Une nouvelle version de l'app est disponible.</strong><br />
              Mettez à jour maintenant pour profiter des dernières améliorations.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.update()));
                  }
                  if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                } catch {}
                window.location.reload();
              }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-roboto font-medium shadow-md hover:opacity-90 transition"
            >
              <Download className="h-4 w-4" />
              Mettre à jour l'app
            </button>
          </div>
        )}

        {/* Update button */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={async () => {
              try {
                if ("serviceWorker" in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.update()));
                }
                if ("caches" in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
              } catch {}
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-roboto font-medium shadow-md hover:opacity-90 transition"
          >
            <Download className="h-4 w-4" />
            Vérifier les mises à jour
          </button>
          <p className="mt-3 text-xs text-muted-foreground/70 font-roboto">
            Recharge l'app avec la dernière version disponible.
          </p>
        </div>

        {/* Footer info */}
        <footer className="mt-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground font-roboto">
            URL à ouvrir : <a href="https://oneworldmorocco.com" className="text-gold hover:underline">oneworldmorocco.com</a>
          </p>
          <p className="text-xs text-muted-foreground/70 font-roboto">
            L'app utilise les mêmes données que le site web — aucun téléchargement depuis un store nécessaire.
          </p>
        </footer>
      </div>
    </main>
    <Footer variant="verified" />
    </>
  );
};

export default Install;
