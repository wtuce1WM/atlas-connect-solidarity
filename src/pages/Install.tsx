import { useEffect, useMemo, useState } from "react";
import { Apple, Smartphone, Monitor, Share, Plus, MoreVertical, Download, Check } from "lucide-react";

type Platform = "ios" | "android" | "mac" | "windows";

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

  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = "Installer l'app — ONE WORLD MOROCCO";
  }, []);

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
        { icon: <Plus className="h-5 w-5" />, text: <>Fais défiler et choisis <strong>« Sur l'écran d'accueil »</strong>.</> },
        { icon: <Check className="h-5 w-5" />, text: <>Touche <strong>Ajouter</strong> en haut à droite. L'icône OW Morocco apparaît sur ton écran d'accueil.</> },
      ],
    },
    android: {
      title: "Installer sur Android",
      steps: [
        { icon: <Smartphone className="h-5 w-5" />, text: <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong>.</> },
        { icon: <MoreVertical className="h-5 w-5" />, text: <>Touche le menu <strong>⋮</strong> en haut à droite.</> },
        { icon: <Download className="h-5 w-5" />, text: <>Choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</> },
        { icon: <Check className="h-5 w-5" />, text: <>Confirme. L'icône OW Morocco s'installe comme une vraie app.</> },
      ],
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
          <img src="/app-icon-512.png" alt="ONE WORLD MOROCCO" className="mx-auto h-24 w-24 rounded-3xl shadow-xl mb-6" />
          <h1 className="font-josefin text-3xl md:text-4xl font-light tracking-wide mb-3">
            Installer ONE WORLD MOROCCO
          </h1>
          <p className="font-roboto text-muted-foreground text-base leading-relaxed">
            Installe l'app sur ton appareil pour un accès en un clic, sans barre d'adresse,
            avec l'icône directement sur ton écran d'accueil ou ton bureau.
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
        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
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
