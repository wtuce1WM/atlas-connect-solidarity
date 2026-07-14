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
import installIosRealStep1 from "@/assets/install-ios-real-step1.webp.asset.json";
import installIosRealStep2 from "@/assets/install-ios-real-step2.webp.asset.json";
import installIosRealStep3 from "@/assets/install-ios-real-step3.webp.asset.json";
import installAndroidStep1 from "@/assets/android-step1.webp.asset.json";
import installAndroidStep2 from "@/assets/android-step2.webp.asset.json";
import installAndroidStep3 from "@/assets/android-step3.webp.asset.json";
import installMacMockup from "@/assets/install-mac-mockup.png.asset.json";
import installWindowsMockup from "@/assets/install-windows-mockup.png.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";

const MOCKUPS: Record<"mac" | "windows", { url: string; alt: Record<Lang, string> }> & {
  ios: { url: string; alt: Record<Lang, string>; label: Record<Lang, string> }[];
  android: { url: string; alt: Record<Lang, string>; label: Record<Lang, string> }[];
} = {
  ios: [
    {
      url: installIosRealStep1.url,
      alt: {
        fr: "Étape 1 : ouvre oneworldmorocco.com dans Safari sur iPhone",
        en: "Step 1: open oneworldmorocco.com in Safari on iPhone",
        ar: "الخطوة 1: افتح oneworldmorocco.com في Safari على iPhone",
      },
      label: { fr: "Étape 1 — Ouvre le site dans Safari", en: "Step 1 — Open the site in Safari", ar: "الخطوة 1 — افتح الموقع في Safari" },
    },
    {
      url: installIosRealStep2.url,
      alt: {
        fr: "Étape 2 : touche le bouton Partager en bas de Safari",
        en: "Step 2: tap the Share button at the bottom of Safari",
        ar: "الخطوة 2: اضغط على زر المشاركة في أسفل Safari",
      },
      label: { fr: "Étape 2 — Touche « Partager »", en: "Step 2 — Tap 'Share'", ar: "الخطوة 2 — اضغط «مشاركة»" },
    },
    {
      url: installIosRealStep3.url,
      alt: {
        fr: "Étape 3 : dans le menu Partager, choisis « Sur l'écran d'accueil »",
        en: "Step 3: in the Share menu, choose 'Add to Home Screen'",
        ar: "الخطوة 3: في قائمة المشاركة، اختر «إضافة إلى الشاشة الرئيسية»",
      },
      label: { fr: "Étape 3 — « Sur l'écran d'accueil »", en: "Step 3 — 'Add to Home Screen'", ar: "الخطوة 3 — «إضافة إلى الشاشة الرئيسية»" },
    },
  ],
  android: [
    {
      url: installAndroidStep1.url,
      alt: {
        fr: "Étape 1 : ouvre oneworldmorocco.com dans Chrome sur Android, puis touche le menu ⋮ en haut à droite",
        en: "Step 1: open oneworldmorocco.com in Chrome on Android, then tap the ⋮ menu at the top right",
        ar: "الخطوة 1: افتح oneworldmorocco.com في Chrome على Android، ثم اضغط على قائمة ⋮ في الأعلى يمينًا",
      },
      label: { fr: "Étape 1 — Touche le menu ⋮", en: "Step 1 — Tap the ⋮ menu", ar: "الخطوة 1 — اضغط قائمة ⋮" },
    },
    {
      url: installAndroidStep2.url,
      alt: {
        fr: "Étape 2 : dans le menu Chrome, touche « Installer et créer… »",
        en: "Step 2: in the Chrome menu, tap 'Install and create…'",
        ar: "الخطوة 2: في قائمة Chrome، اضغط «تثبيت وإنشاء…»",
      },
      label: { fr: "Étape 2 — « Installer et créer… »", en: "Step 2 — 'Install and create…'", ar: "الخطوة 2 — «تثبيت وإنشاء…»" },
    },
    {
      url: installAndroidStep3.url,
      alt: {
        fr: "Étape 3 : confirme en touchant « Installer » dans la boîte de dialogue",
        en: "Step 3: confirm by tapping 'Install' in the dialog",
        ar: "الخطوة 3: أكّد بالضغط على «تثبيت» في مربع الحوار",
      },
      label: { fr: "Étape 3 — Touche « Installer »", en: "Step 3 — Tap 'Install'", ar: "الخطوة 3 — اضغط «تثبيت»" },
    },
  ],
  mac: {
    url: installMacMockup.url,
    alt: {
      fr: "Illustration : menu Fichier de Safari macOS avec « Ajouter au Dock… » entouré en terracotta",
      en: "Illustration: Safari macOS File menu with 'Add to Dock…' circled in terracotta",
      ar: "توضيح: قائمة ملف في Safari على macOS مع خيار «إضافة إلى Dock…» محاط باللون التراكوتا",
    },
  },
  windows: {
    url: installWindowsMockup.url,
    alt: {
      fr: "Illustration : barre d'adresse Chrome sur Windows avec l'icône ⊕ Installer entourée en terracotta",
      en: "Illustration: Chrome address bar on Windows with the ⊕ Install icon circled in terracotta",
      ar: "توضيح: شريط عناوين Chrome على Windows مع أيقونة ⊕ تثبيت محاطة باللون التراكوتا",
    },
  },
};

const MOCKUP_CAPTION: Record<Lang, string> = {
  fr: "Illustration provisoire — les captures réelles arrivent bientôt.",
  en: "Provisional illustration — real screenshots coming soon.",
  ar: "توضيح مؤقت — لقطات الشاشة الحقيقية قريباً.",
};

const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = zelligeBrunAsset.url;

type Lang = "fr" | "en" | "ar";

const I18N = {
  fr: {
    docTitle: "Installer l'app — ONE WORLD MOROCCO",
    h1: "Installer l'App",
    heroSubWithPrompt: "Touche l'icône ci-dessous pour installer l'app en un clic, ou suis les étapes ci-dessous.",
    heroSubDefault: "Installe l'app sur ton appareil pour un accès en un clic, sans barre d'adresse, avec l'icône directement sur ton écran d'accueil ou ton bureau.",
    install: "Installer",
    installUpdate: "Installer mise à jour",
    howToInstall: "Comment installer",
    installed: "Installée",
    ariaInstalled: "Application déjà installée",
    ariaInstallNow: "Installer l'application maintenant",
    ariaSeeInstructions: "Voir les instructions d'installation",
    updateBannerStrong: "Une nouvelle version de l'app est disponible.",
    updateBannerText: "Mettez à jour maintenant pour profiter des dernières améliorations.",
    updateNow: "Mettre à jour l'app",
    checkUpdates: "Vérifier les mises à jour",
    checkUpdatesHint: "Recharge l'app avec la dernière version disponible.",
    urlToOpen: "URL à ouvrir :",
    sameDataNote: "L'app utilise les mêmes données que le site web — aucun téléchargement depuis un store nécessaire.",
    tabs: { ios: "iPhone / iPad", android: "Android", mac: "Mac", windows: "Windows" },
    guides: {
      ios: {
        title: "Installer sur iPhone / iPad",
        steps: [
          <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (obligatoire, ne fonctionne pas dans Chrome iOS).</>,
          <>Touche le bouton <strong>Partager</strong> en bas de l'écran (carré avec une flèche vers le haut).</>,
          <>Dans le menu Partager, <strong>fais défiler vers le bas</strong> dans la liste des actions (sous la rangée d'icônes d'apps), puis choisis <strong>« Sur l'écran d'accueil »</strong> (ou <strong>« Ajouter à l'écran d'accueil »</strong>).</>,
          <>Touche <strong>Ajouter</strong> en haut à droite. L'icône OW Morocco apparaît sur ton écran d'accueil.</>,
        ],
        note: "Tu ne vois pas « Sur l'écran d'accueil » ? 1) Vérifie que tu es bien dans Safari (pas Chrome ni Instagram/Facebook in-app) — sinon copie le lien et ouvre-le dans Safari. 2) Dans le menu Partager, l'option est plus bas dans la liste : fais défiler. 3) Si elle n'apparaît toujours pas, touche « Modifier les actions » tout en bas et active « Sur l'écran d'accueil ». 4) Sur iOS en mode navigation privée, l'option est masquée — quitte la navigation privée.",
      },
      android: {
        title: "Installer sur Android",
        steps: [
          <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong>, puis touche le menu <strong>⋮</strong> en haut à droite.</>,
          <>Dans le menu, touche <strong>« Installer et créer… »</strong> (fais défiler si nécessaire).</>,
          <>Dans la boîte de dialogue <strong>« Installer l'application »</strong>, touche <strong>Installer</strong>. L'icône OW Morocco s'ajoute à ton écran d'accueil comme une vraie app.</>,
        ],
        note: "Utilise bien Chrome (pas Samsung Internet ni Firefox), sinon Google Play Protect peut afficher « Appli non sécurisée bloquée » — dans ce cas, touche « Plus de détails » puis « Installer quand même », ou réinstalle depuis Chrome.",
      },
      mac: {
        title: "Installer sur Mac",
        steps: [
          <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Safari</strong> (macOS Sonoma+) ou <strong>Chrome</strong>.</>,
          <><strong>Safari :</strong> menu <strong>Fichier → Ajouter au Dock…</strong><br /><strong>Chrome :</strong> menu <strong>Fichier → Installer ONE WORLD MOROCCO…</strong> (ou icône ⊕ dans la barre d'adresse).</>,
          <>L'app s'ouvre dans sa propre fenêtre, sans barre d'adresse, et apparaît dans le Dock et le Launchpad.</>,
        ],
        note: "Dans Chrome, tu peux glisser l'icône depuis Launchpad vers le Dock pour l'épingler.",
      },
      windows: {
        title: "Installer sur Windows",
        steps: [
          <>Ouvre <strong>oneworldmorocco.com</strong> dans <strong>Chrome</strong> ou <strong>Edge</strong>.</>,
          <>Clique sur l'icône <strong>⊕ Installer</strong> à droite de la barre d'adresse (ou menu <strong>⋮ → Installer ONE WORLD MOROCCO</strong>).</>,
          <>Confirme. L'app s'épingle au menu Démarrer et à la barre des tâches.</>,
        ],
      },
    },
  },
  en: {
    docTitle: "Install the app — ONE WORLD MOROCCO",
    h1: "Install the App",
    heroSubWithPrompt: "Tap the icon below to install the app in one click, or follow the steps below.",
    heroSubDefault: "Install the app on your device for one-tap access, with no address bar, and the icon right on your home screen or desktop.",
    install: "Install",
    installUpdate: "Install update",
    howToInstall: "How to install",
    installed: "Installed",
    ariaInstalled: "App already installed",
    ariaInstallNow: "Install the app now",
    ariaSeeInstructions: "See installation instructions",
    updateBannerStrong: "A new version of the app is available.",
    updateBannerText: "Update now to enjoy the latest improvements.",
    updateNow: "Update the app",
    checkUpdates: "Check for updates",
    checkUpdatesHint: "Reload the app with the latest available version.",
    urlToOpen: "URL to open:",
    sameDataNote: "The app uses the same data as the website — no store download required.",
    tabs: { ios: "iPhone / iPad", android: "Android", mac: "Mac", windows: "Windows" },
    guides: {
      ios: {
        title: "Install on iPhone / iPad",
        steps: [
          <>Open <strong>oneworldmorocco.com</strong> in <strong>Safari</strong> (required, it doesn't work in Chrome iOS).</>,
          <>Tap the <strong>Share</strong> button at the bottom of the screen (square with an up arrow).</>,
          <>In the Share menu, <strong>scroll down</strong> through the list of actions (below the row of app icons), then choose <strong>"Add to Home Screen"</strong>.</>,
          <>Tap <strong>Add</strong> in the top right. The OW Morocco icon appears on your home screen.</>,
        ],
        note: "Can't see \"Add to Home Screen\"? 1) Make sure you're in Safari (not Chrome, Instagram or Facebook in-app) — otherwise copy the link and open it in Safari. 2) In the Share menu, the option is lower in the list: scroll down. 3) If it still doesn't appear, tap \"Edit Actions\" at the bottom and enable \"Add to Home Screen\". 4) On iOS in private browsing, the option is hidden — exit private browsing.",
      },
      android: {
        title: "Install on Android",
        steps: [
          <>Open <strong>oneworldmorocco.com</strong> in <strong>Chrome</strong>, then tap the <strong>⋮</strong> menu at the top right.</>,
          <>In the menu, tap <strong>"Install and create…"</strong> (scroll down if needed).</>,
          <>In the <strong>"Install app"</strong> dialog, tap <strong>Install</strong>. The OW Morocco icon is added to your home screen like a real app.</>,
        ],
        note: "Use Chrome (not Samsung Internet or Firefox), otherwise Google Play Protect may show \"Unsafe app blocked\" — tap \"More details\" then \"Install anyway\", or reinstall from Chrome.",
      },
      mac: {
        title: "Install on Mac",
        steps: [
          <>Open <strong>oneworldmorocco.com</strong> in <strong>Safari</strong> (macOS Sonoma+) or <strong>Chrome</strong>.</>,
          <><strong>Safari:</strong> menu <strong>File → Add to Dock…</strong><br /><strong>Chrome:</strong> menu <strong>File → Install ONE WORLD MOROCCO…</strong> (or ⊕ icon in the address bar).</>,
          <>The app opens in its own window, with no address bar, and appears in the Dock and Launchpad.</>,
        ],
        note: "In Chrome, you can drag the icon from Launchpad to the Dock to pin it.",
      },
      windows: {
        title: "Install on Windows",
        steps: [
          <>Open <strong>oneworldmorocco.com</strong> in <strong>Chrome</strong> or <strong>Edge</strong>.</>,
          <>Click the <strong>⊕ Install</strong> icon to the right of the address bar (or menu <strong>⋮ → Install ONE WORLD MOROCCO</strong>).</>,
          <>Confirm. The app pins to the Start menu and the taskbar.</>,
        ],
      },
    },
  },
  ar: {
    docTitle: "تثبيت التطبيق — ONE WORLD MOROCCO",
    h1: "تثبيت التطبيق",
    heroSubWithPrompt: "اضغط على الأيقونة أدناه لتثبيت التطبيق بنقرة واحدة، أو اتبع الخطوات أدناه.",
    heroSubDefault: "ثبّت التطبيق على جهازك للوصول بنقرة واحدة، بدون شريط العناوين، مع الأيقونة مباشرة على شاشتك الرئيسية أو سطح المكتب.",
    install: "تثبيت",
    installUpdate: "تثبيت التحديث",
    howToInstall: "كيفية التثبيت",
    installed: "مثبّت",
    ariaInstalled: "التطبيق مثبّت بالفعل",
    ariaInstallNow: "تثبيت التطبيق الآن",
    ariaSeeInstructions: "عرض تعليمات التثبيت",
    updateBannerStrong: "إصدار جديد من التطبيق متاح.",
    updateBannerText: "حدّث الآن للاستفادة من آخر التحسينات.",
    updateNow: "تحديث التطبيق",
    checkUpdates: "التحقق من التحديثات",
    checkUpdatesHint: "أعد تحميل التطبيق بأحدث إصدار متاح.",
    urlToOpen: "الرابط للفتح:",
    sameDataNote: "يستخدم التطبيق نفس بيانات الموقع — لا حاجة للتنزيل من أي متجر.",
    tabs: { ios: "آيفون / آيباد", android: "أندرويد", mac: "ماك", windows: "ويندوز" },
    guides: {
      ios: {
        title: "التثبيت على آيفون / آيباد",
        steps: [
          <>افتح <strong>oneworldmorocco.com</strong> في <strong>Safari</strong> (إلزامي، لا يعمل في Chrome على iOS).</>,
          <>اضغط على زر <strong>المشاركة</strong> في أسفل الشاشة (مربع به سهم لأعلى).</>,
          <>في قائمة المشاركة، <strong>مرّر للأسفل</strong> في قائمة الإجراءات (أسفل صف أيقونات التطبيقات)، ثم اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</>,
          <>اضغط <strong>إضافة</strong> في الأعلى يمينًا. تظهر أيقونة OW Morocco على شاشتك الرئيسية.</>,
        ],
        note: "لا ترى «إضافة إلى الشاشة الرئيسية»؟ 1) تأكد أنك في Safari (وليس Chrome أو Instagram/Facebook). 2) في قائمة المشاركة، الخيار في الأسفل: مرّر للأسفل. 3) إذا لم يظهر، اضغط «تعديل الإجراءات» في الأسفل وفعّل «إضافة إلى الشاشة الرئيسية». 4) في وضع التصفح الخاص، الخيار مخفي — اخرج من التصفح الخاص.",
      },
      android: {
        title: "التثبيت على أندرويد",
        steps: [
          <>افتح <strong>oneworldmorocco.com</strong> في <strong>Chrome</strong>، ثم اضغط على قائمة <strong>⋮</strong> في الأعلى يمينًا.</>,
          <>في القائمة، اضغط على <strong>«تثبيت وإنشاء…»</strong> (مرّر للأسفل عند الحاجة).</>,
          <>في مربع الحوار <strong>«تثبيت التطبيق»</strong>، اضغط <strong>تثبيت</strong>. تُضاف أيقونة OW Morocco إلى شاشتك الرئيسية كتطبيق حقيقي.</>,
        ],
        note: "استخدم Chrome (وليس Samsung Internet أو Firefox)، وإلا قد يعرض Google Play Protect «تم حجب تطبيق غير آمن» — اضغط «مزيد من التفاصيل» ثم «التثبيت على أي حال»، أو أعد التثبيت من Chrome.",
      },
      mac: {
        title: "التثبيت على ماك",
        steps: [
          <>افتح <strong>oneworldmorocco.com</strong> في <strong>Safari</strong> (macOS Sonoma+) أو <strong>Chrome</strong>.</>,
          <><strong>Safari:</strong> قائمة <strong>ملف ← إضافة إلى Dock…</strong><br /><strong>Chrome:</strong> قائمة <strong>ملف ← تثبيت ONE WORLD MOROCCO…</strong> (أو أيقونة ⊕ في شريط العنوان).</>,
          <>يُفتح التطبيق في نافذته الخاصة، بدون شريط العناوين، ويظهر في Dock وLaunchpad.</>,
        ],
        note: "في Chrome، يمكنك سحب الأيقونة من Launchpad إلى Dock لتثبيتها.",
      },
      windows: {
        title: "التثبيت على ويندوز",
        steps: [
          <>افتح <strong>oneworldmorocco.com</strong> في <strong>Chrome</strong> أو <strong>Edge</strong>.</>,
          <>انقر على أيقونة <strong>⊕ تثبيت</strong> على يمين شريط العنوان (أو قائمة <strong>⋮ ← تثبيت ONE WORLD MOROCCO</strong>).</>,
          <>أكّد. يُثبَّت التطبيق في قائمة «ابدأ» وشريط المهام.</>,
        ],
      },
    },
  },
} as const;


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
  const { language } = useLanguage();
  const lang: Lang = (["fr", "en", "ar"].includes(language) ? language : "fr") as Lang;
  const t = I18N[lang];

  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = t.docTitle;

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

  useEffect(() => { document.title = t.docTitle; }, [t.docTitle]);

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
      { id: "ios", label: t.tabs.ios, Icon: Apple },
      { id: "android", label: t.tabs.android, Icon: Smartphone },
      { id: "mac", label: t.tabs.mac, Icon: Apple },
      { id: "windows", label: t.tabs.windows, Icon: Monitor },
    ],
    [t]
  );

  const STEP_ICONS: Record<Platform, JSX.Element[]> = {
    ios: [
      <Apple className="h-5 w-5 text-[#C04F17]" />,
      <Share className="h-5 w-5 text-[#C04F17]" />,
      <Plus className="h-5 w-5 text-[#C04F17]" />,
      <Check className="h-5 w-5 text-[#C04F17]" />,
    ],
    android: [
      <Smartphone className="h-5 w-5 text-[#C04F17]" />,
      <MoreVertical className="h-5 w-5 text-[#C04F17]" />,
      <Download className="h-5 w-5 text-[#C04F17]" />,
      <Check className="h-5 w-5 text-[#C04F17]" />,
    ],
    mac: [
      <Monitor className="h-5 w-5 text-[#C04F17]" />,
      <Download className="h-5 w-5 text-[#C04F17]" />,
      <Check className="h-5 w-5 text-[#C04F17]" />,
    ],
    windows: [
      <Monitor className="h-5 w-5 text-[#C04F17]" />,
      <Download className="h-5 w-5 text-[#C04F17]" />,
      <Check className="h-5 w-5 text-[#C04F17]" />,
    ],
  };

  const localizedGuide = t.guides[platform];
  const guide = {
    title: localizedGuide.title,
    steps: localizedGuide.steps.map((text, i) => ({ icon: STEP_ICONS[platform][i], text })),
    note: (localizedGuide as { note?: string }).note,
  };

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
                {t.h1}
              </h1>
              {/* Desktop/Tablet Title */}
              <h1 style={{ lineHeight: 1.2 }} className="hidden md:block font-josefin md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center [text-shadow:0_2px_4px_rgba(0,0,0,0.6)] mb-2">
                {t.h1}
              </h1>

              <p className="mt-6 md:mt-2 max-w-2xl md:max-lg:mx-0 md:max-lg:text-left lg:mx-auto lg:text-center font-roboto text-base font-normal text-white md:text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                {installEvent ? t.heroSubWithPrompt : t.heroSubDefault}
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
                      ? t.ariaInstalled
                      : installEvent
                        ? t.ariaInstallNow
                        : t.ariaSeeInstructions
                  }
                >
                  {!installed ? (
                    <>
                      <Download className="h-4 w-4" />
                      {installEvent ? t.install : updateAvailable ? t.installUpdate : t.howToInstall}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {t.installed}
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

          {/* Illustration provisoire — sera remplacée par de vraies captures */}
          <figure className="mb-6 flex flex-col items-center">
            {platform === "ios" || platform === "android" ? (
              <div className="grid grid-cols-1 gap-6 w-full max-w-sm mx-auto">
                {MOCKUPS[platform].map((m, i) => {
                  const badgePos = platform === "ios"
                    ? [
                        { left: "90%", top: "94%" },
                        { left: "74%", top: "57%" },
                        { left: "76%", top: "80%" },
                      ][i]
                    : [
                        { left: "82%", top: "8%" },   // étape 1 : sous/à gauche du menu ⋮ sans le cacher
                        { left: "88%", top: "56%" },  // étape 2 : à droite de « Installer et créer… »
                        { left: "88%", top: "72%" },  // étape 3 : à côté du bouton « Installer »
                      ][i];
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <div className="relative w-full">
                        <img
                          src={m.url}
                          alt={m.alt[lang]}
                          width={1024}
                          height={1024}
                          loading="lazy"
                          className="w-full h-auto rounded-2xl border border-border/60 bg-[#F5EFE6] shadow-sm"
                        />
                        <span
                          className="absolute flex items-center justify-center h-7 w-7 rounded-full bg-[#C04F17] text-white text-sm font-bold shadow-md"
                          style={{ left: badgePos.left, top: badgePos.top, transform: "translate(-50%, -50%)" }}
                        >
                          {i + 1}
                        </span>
                      </div>
                      <span className="mt-2 text-sm font-roboto font-medium text-[#C04F17]">
                        {m.label[lang]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <img
                src={MOCKUPS[platform].url}
                alt={MOCKUPS[platform].alt[lang]}
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full max-w-sm md:max-w-md h-auto rounded-2xl border border-border/60 bg-[#F5EFE6] shadow-sm"
              />
            )}
            {platform !== "ios" && platform !== "android" && (
              <figcaption className="mt-3 text-xs text-muted-foreground/70 font-roboto italic text-center">
                {MOCKUP_CAPTION[lang]}
              </figcaption>
            )}
          </figure>



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
              <strong>{t.updateBannerStrong}</strong><br />
              {t.updateBannerText}
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
              {t.updateNow}
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
            {t.checkUpdates}
          </button>
          <p className="mt-3 text-xs text-muted-foreground/70 font-roboto">
            {t.checkUpdatesHint}
          </p>
        </div>

        {/* Footer info */}
        <footer className="mt-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground font-roboto">
            {t.urlToOpen} <a href="https://oneworldmorocco.com" className="text-gold hover:underline">oneworldmorocco.com</a>
          </p>
          <p className="text-xs text-muted-foreground/70 font-roboto">
            {t.sameDataNote}
          </p>
        </footer>
      </div>
    </main>
    <Footer variant="verified" />
    </>
  );
};

export default Install;
