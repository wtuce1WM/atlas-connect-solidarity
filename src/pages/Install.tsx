import { useEffect, useMemo, useRef, useState } from "react";
import { Apple, Smartphone, Monitor, Share, Plus, MoreVertical, Download, Check } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import { resolveHomepageCity } from "@/lib/cityHomepage";

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
  const guideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = "Installer l'app — ONE WORLD MOROCCO";

    // Already installed (standalone mode) → redirect to /test with resolved city
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
    if (isStandalone) {
      setInstalled(true);
      redirectStandaloneToHome();
      return;
    }

    const readCapturedInstallPrompt = () => {
      const capturedEvent = (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
      if (capturedEvent) setInstallEvent(capturedEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setInstallEvent(null);
      delete (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
      redirectStandaloneToHome();
    };

    readCapturedInstallPrompt();
    window.addEventListener("owm-installprompt-ready", readCapturedInstallPrompt);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("owm-installprompt-ready", readCapturedInstallPrompt);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleIconClick = async () => {
    if (installed) {
      redirectStandaloneToHome();
      return;
    }
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setInstallEvent(null);
        delete (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
        redirectStandaloneToHome();
      }
      return;
    }
    // Fallback: scroll to platform-specific guide
    guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs: { id: Platform; label: string; icon: JSX.Element }[] = useMemo(
    () => [
      { id: "ios", label: "iPhone / iPad", icon: <Apple className="h-4 w-4" /> },
      { id: "android", label: "Android", icon: <Smartphone className="h-4 w-4" /> },
      { id: "mac", label: "Mac", icon: <Apple className="h-4 w-4" /> },
      { id: "windows", label: "Windows", icon: <Monitor className="h-4 w-4" /> },
    ],
    []
  );

  const guides: Record<Platform, { title: string; steps: { icon: JSX.Element; text: React.ReactNode }[]; note?: string }> = {
    ios: {
      title: "Installer sur iPhone / iPad",
      steps: [
        { icon: <Apple className="h-5 w-5" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (obligatoire, ne fonctionne pas dans Chrome iOS).</> },
        { icon: <Share className="h-5 w-5" />, text: <>Touche le bouton <strong>Partager</strong> en bas de l'écran (carré avec une flèche vers le haut).</> },
        { icon: <Plus className="h-5 w-5" />, text: <>Dans le menu Partager, <strong>fais défiler vers le bas</strong> dans la liste des actions (sous la rangée d'icônes d'apps), puis choisis <strong>« Sur l'écran d'accueil »</strong> (ou <strong>« Ajouter à l'écran d'accueil »</strong>).</> },
        { icon: <Check className="h-5 w-5" />, text: <>Touche <strong>Ajouter</strong> en haut à droite. L'icône OW Morocco apparaît sur ton écran d'accueil.</> },
      ],
      note: "Tu ne vois pas « Sur l'écran d'accueil » ? 1) Vérifie que tu es bien dans Safari (pas Chrome ni Instagram/Facebook in-app) — sinon copie le lien et ouvre-le dans Safari. 2) Dans le menu Partager, l'option est plus bas dans la liste : fais défiler. 3) Si elle n'apparaît toujours pas, touche « Modifier les actions » tout en bas et active « Sur l'écran d'accueil ». 4) Sur iOS en mode navigation privée, l'option est masquée — quitte la navigation privée.",
    },
    android: {
      title: "Installer sur Android",
      steps: [
        { icon: <Smartphone className="h-5 w-5" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong> (obligatoire — n'utilise pas Samsung Internet ni Firefox, sinon Google Play Protect peut bloquer l'installation).</> },
        { icon: <MoreVertical className="h-5 w-5" />, text: <>Touche le menu <strong>⋮</strong> en haut à droite.</> },
        { icon: <Download className="h-5 w-5" />, text: <>Choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</> },
        { icon: <Check className="h-5 w-5" />, text: <>Confirme. L'icône OW Morocco s'installe comme une vraie app.</> },
      ],
      note: "Si Google Play Protect affiche « Appli non sécurisée bloquée », c'est que l'installation s'est faite via Samsung Internet ou Firefox. Touche « Plus de détails » puis « Installer quand même », ou réinstalle depuis Chrome pour éviter le message.",
    },
    mac: {
      title: "Installer sur Mac",
      steps: [
        { icon: <Monitor className="h-5 w-5" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (macOS Sonoma+) ou <strong>Chrome</strong>.</> },
        { icon: <Download className="h-5 w-5" />, text: <><strong>Safari :</strong> menu <strong>Fichier → Ajouter au Dock…</strong><br /><strong>Chrome :</strong> menu <strong>Fichier → Installer ONE WORLD MOROCCO…</strong> (ou icône ⊕ dans la barre d'adresse).</> },
        { icon: <Check className="h-5 w-5" />, text: <>L'app s'ouvre dans sa propre fenêtre, sans barre d'adresse, et apparaît dans le Dock et le Launchpad.</> },
      ],
      note: "Dans Chrome, tu peux glisser l'icône depuis Launchpad vers le Dock pour l'épingler.",
    },
    windows: {
      title: "Installer sur Windows",
      steps: [
        { icon: <Monitor className="h-5 w-5" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong> ou <strong>Edge</strong>.</> },
        { icon: <Download className="h-5 w-5" />, text: <>Clique sur l'icône <strong>⊕ Installer</strong> à droite de la barre d'adresse (ou menu <strong>⋮ → Installer ONE WORLD MOROCCO</strong>).</> },
        { icon: <Check className="h-5 w-5" />, text: <>Confirme. L'app s'épingle au menu Démarrer et à la barre des tâches.</> },
      ],
    },
  };

  const guide = guides[platform];

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <button
            type="button"
            onClick={handleIconClick}
            className="group relative mx-auto mb-8 block focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-3xl cursor-pointer"
            aria-label={
              installed
                ? "Application déjà installée"
                : installEvent
                  ? "Installer l'application maintenant"
                  : "Voir les instructions d'installation"
            }
          >
            <img
              src="/app-icon-512.png"
              alt="ONE WORLD MOROCCO"
              className={`h-24 w-24 rounded-3xl shadow-xl transition-transform group-hover:scale-105 group-active:scale-95 cursor-pointer`}
            />
            {!installed && (
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold text-[hsl(var(--background))] text-xs font-roboto font-medium shadow-lg whitespace-nowrap">
                <Download className="h-3 w-3" />
                {installEvent ? "Installer" : "Comment installer"}
              </span>
            )}
            {installed && (
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-roboto font-medium shadow-lg whitespace-nowrap">
                <Check className="h-3 w-3" />
                Installée
              </span>
            )}
          </button>
          <h1 className="font-josefin text-3xl md:text-4xl font-light tracking-wide mb-3">
            Installer ONE WORLD MOROCCO
          </h1>
          <p className="font-roboto text-muted-foreground text-base leading-relaxed">
            {installEvent
              ? "Touche l'icône ci-dessus pour installer l'app en un clic, ou suis les étapes ci-dessous."
              : "Installe l'app sur ton appareil pour un accès en un clic, sans barre d'adresse, avec l'icône directement sur ton écran d'accueil ou ton bureau."}
          </p>
        </header>

        {/* Platform tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPlatform(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-roboto transition-all ${
                platform === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
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
  );
};

export default Install;
