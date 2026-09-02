import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Apple, Smartphone, Monitor, Share, Plus, MoreVertical, Download, Check, ChevronDown, ChevronUp } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import { resolveHomepageCity } from "@/lib/cityHomepage";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
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

const SCREENS = 4;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const hardRefresh = async () => {
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
};

const Install = () => {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { language } = useLanguage();
  const navigate = useLocalizedNavigate();
  const lang: Lang = (["fr", "en", "ar"].includes(language) ? language : "fr") as Lang;
  const t = I18N[lang];

  // ---------- Défilement écran par écran (modèle /corporate) ----------
  const [progress, setProgress] = useState(0);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const sectionRef = useRef<HTMLElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const touchYRef = useRef<number | null>(null);
  const wheelLockedRef = useRef(false);
  const wheelUnlockRef = useRef<number | null>(null);

  useEffect(() => {
    const mqO = window.matchMedia("(max-aspect-ratio: 1/1)");
    const mqM = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onO = () => setIsPortrait(mqO.matches);
    const onM = () => setReduced(mqM.matches);
    mqO.addEventListener("change", onO);
    mqM.addEventListener("change", onM);
    return () => {
      mqO.removeEventListener("change", onO);
      mqM.removeEventListener("change", onM);
    };
  }, []);

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

  const setTarget = useCallback(
    (v: number) => {
      targetRef.current = clamp(v, 0, SCREENS - 1);
      if (reduced) {
        currentRef.current = targetRef.current;
        setProgress(targetRef.current);
        return;
      }
      if (rafRef.current !== null) return;
      const tick = () => {
        currentRef.current += (targetRef.current - currentRef.current) * 0.035;
        if (Math.abs(targetRef.current - currentRef.current) < 0.002) {
          currentRef.current = targetRef.current;
          setProgress(currentRef.current);
          rafRef.current = null;
          return;
        }
        setProgress(currentRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [reduced],
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const inScrollable = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("[data-owm-scroll]"));
    const onWheel = (e: WheelEvent) => {
      if (inScrollable(e.target)) return;
      e.preventDefault();
      if (wheelLockedRef.current || Math.abs(e.deltaY) < 8) return;
      wheelLockedRef.current = true;
      setTarget(Math.round(targetRef.current) + (e.deltaY > 0 ? 1 : -1));
      wheelUnlockRef.current = window.setTimeout(() => {
        wheelLockedRef.current = false;
        wheelUnlockRef.current = null;
      }, 1400);
    };
    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = inScrollable(e.target) ? null : e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (y === null || touchYRef.current === null) return;
      e.preventDefault();
      setTarget(targetRef.current + (touchYRef.current - y) / 320);
      touchYRef.current = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setTarget(Math.round(targetRef.current) + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setTarget(Math.round(targetRef.current) - 1);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      if (wheelUnlockRef.current !== null) {
        window.clearTimeout(wheelUnlockRef.current);
        wheelUnlockRef.current = null;
      }
    };
  }, [setTarget]);

  // ---------- Logique PWA (inchangée) ----------
  useEffect(() => {
    setPlatform(detectPlatform());
    document.title = t.docTitle;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((navigator as NavigatorWithStandalone).standalone);
    if (isStandalone) setInstalled(true);

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
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (!reg) return;
          if (reg.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
          trackWorker(reg.installing);
          const onUpdateFound = () => trackWorker(reg.installing);
          reg.addEventListener("updatefound", onUpdateFound);
          cleanupSw = () => reg.removeEventListener("updatefound", onUpdateFound);
          reg.update().catch(() => {});
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("owm-installprompt-ready", readCapturedInstallPrompt);
      window.removeEventListener("appinstalled", installedHandler);
      cleanupSw?.();
    };
  }, []);

  useEffect(() => {
    document.title = t.docTitle;
  }, [t.docTitle]);

  const handleIconClick = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      import("@/lib/analytics")
        .then(({ trackEvent }) => trackEvent("pwa_install_outcome", { outcome }))
        .catch(() => {});
      if (outcome === "accepted") {
        setInstalled(true);
        setInstallEvent(null);
        delete (window as WindowWithInstallPrompt).__owmInstallPromptEvent;
      }
      return;
    }
    setTarget(1);
  };

  const tabs: { id: Platform; label: string; Icon: React.ComponentType<{ className?: string }> }[] =
    useMemo(
      () => [
        { id: "ios", label: t.tabs.ios, Icon: Apple },
        { id: "android", label: t.tabs.android, Icon: Smartphone },
        { id: "mac", label: t.tabs.mac, Icon: Apple },
        { id: "windows", label: t.tabs.windows, Icon: Monitor },
      ],
      [t],
    );

  const STEP_ICONS: Record<Platform, JSX.Element[]> = {
    ios: [
      <Apple className="h-5 w-5 text-[#C6A046]" />,
      <Share className="h-5 w-5 text-[#C6A046]" />,
      <Plus className="h-5 w-5 text-[#C6A046]" />,
      <Check className="h-5 w-5 text-[#C6A046]" />,
    ],
    android: [
      <Smartphone className="h-5 w-5 text-[#C6A046]" />,
      <MoreVertical className="h-5 w-5 text-[#C6A046]" />,
      <Download className="h-5 w-5 text-[#C6A046]" />,
      <Check className="h-5 w-5 text-[#C6A046]" />,
    ],
    mac: [
      <Monitor className="h-5 w-5 text-[#C6A046]" />,
      <Download className="h-5 w-5 text-[#C6A046]" />,
      <Check className="h-5 w-5 text-[#C6A046]" />,
    ],
    windows: [
      <Monitor className="h-5 w-5 text-[#C6A046]" />,
      <Download className="h-5 w-5 text-[#C6A046]" />,
      <Check className="h-5 w-5 text-[#C6A046]" />,
    ],
  };

  const localizedGuide = t.guides[platform];
  const guide = {
    title: localizedGuide.title,
    steps: localizedGuide.steps.map((text, i) => ({ icon: STEP_ICONS[platform][i], text })),
    note: (localizedGuide as { note?: string }).note,
  };

  const layer = (index: number) => {
    const d = progress - index;
    const opacity = clamp(1 - Math.abs(d) * 1.6, 0, 1);
    const active = Math.abs(d) < 0.45;
    return {
      opacity,
      transform: reduced ? undefined : `translateY(${d * -48}px)`,
      pointerEvents: active ? ("auto" as const) : ("none" as const),
      ariaHidden: !active,
    };
  };

  const s1 = layer(0);
  const s2 = layer(1);
  const s3 = layer(2);
  const s4 = layer(3);
  const current = Math.round(progress);

  const platformTabs = (
    <div className="flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => {
        const isActive = platform === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPlatform(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-roboto text-sm font-bold transition-all ${
              isActive
                ? "bg-[#C04F17] text-white shadow-md"
                : "border border-[rgba(198,160,70,.34)] bg-black/40 text-white/80 backdrop-blur hover:bg-black/60"
            }`}
          >
            <tab.Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#C6A046]"}`} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section
        ref={sectionRef}
        className="relative h-[100dvh] min-h-[560px] w-full touch-none overflow-hidden bg-[hsl(0_0%_4%)]"
      >
        {/* Vidéo de fond — reprise de la homepage */}
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
          style={{ filter: `brightness(${1 - clamp(progress / (SCREENS - 1), 0, 1) * 0.4})` }}
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.62) 0%, rgba(6,5,4,.48) 35%, rgba(6,5,4,.74) 75%, rgba(6,5,4,.92) 100%)",
          }}
        />

        {/* ============ Écran 1 — Hero installation ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-24 pb-24 md:px-12"
          style={{ opacity: s1.opacity, transform: s1.transform, pointerEvents: s1.pointerEvents }}
          aria-hidden={s1.ariaHidden}
        >
          <img
            src={phoneMockupAsset.url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-[3%] top-1/2 z-0 hidden h-[58%] w-auto -translate-y-1/2 lg:block"
          />
          <h1
            className="relative z-10 max-w-4xl text-center text-[28px] leading-[1.15] text-[#F4ECDF] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {t.h1}
          </h1>
          <p className="relative z-10 mt-5 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white md:text-[1.125rem]">
            {installEvent ? t.heroSubWithPrompt : t.heroSubDefault}
          </p>

          <button
            type="button"
            onClick={handleIconClick}
            className="btn-shimmer group relative mt-9 block h-20 w-20 overflow-hidden rounded-[1.25rem] border border-white/35 bg-white/5 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-transform hover:scale-105 active:scale-95 md:h-24 md:w-24"
            aria-label={
              installed ? t.ariaInstalled : installEvent ? t.ariaInstallNow : t.ariaSeeInstructions
            }
          >
            <span className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-white/0 via-white/5 to-white/15" />
            <img
              src={appIconHamsaAsset.url}
              alt="ONE WORLD MOROCCO"
              className="relative z-0 h-full w-full object-cover"
            />
          </button>

          <button
            type="button"
            onClick={handleIconClick}
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
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

          <button
            type="button"
            onClick={hardRefresh}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(198,160,70,.5)] bg-black/45 px-7 py-3 font-roboto text-sm font-medium text-white backdrop-blur transition hover:bg-black/60"
          >
            <Download className="h-4 w-4" />
            {t.checkUpdates}
          </button>
        </div>

        {/* ============ Écran 2 — Étapes par plateforme ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s2.opacity, transform: s2.transform, pointerEvents: s2.pointerEvents }}
          aria-hidden={s2.ariaHidden}
        >
          {platformTabs}
          <h2
            className="text-center text-[clamp(22px,3.4vw,38px)] leading-[1.15] text-[#F4ECDF]"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            {guide.title}
          </h2>
          <div
            data-owm-scroll
            className="max-h-[52vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[rgba(198,160,70,.34)] bg-black/45 p-5 backdrop-blur md:p-7"
          >
            <ol className="space-y-4">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(198,160,70,.34)] bg-black/40">
                    {step.icon}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#C04F17] text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="font-roboto leading-relaxed text-white/90">{step.text}</span>
                  </div>
                </li>
              ))}
            </ol>
            {guide.note && (
              <p className="mt-5 border-t border-[rgba(198,160,70,.2)] pt-4 font-roboto text-sm italic text-white/70">
                💡 {guide.note}
              </p>
            )}
          </div>
        </div>

        {/* ============ Écran 3 — Captures / illustrations ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s3.opacity, transform: s3.transform, pointerEvents: s3.pointerEvents }}
          aria-hidden={s3.ariaHidden}
        >
          {platformTabs}
          <div
            data-owm-scroll
            className="max-h-[62vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-[rgba(198,160,70,.34)] bg-black/45 p-4 backdrop-blur md:max-w-md"
          >
            {platform === "ios" || platform === "android" ? (
              <div className="grid grid-cols-1 gap-6">
                {MOCKUPS[platform].map((m, i) => {
                  const badgePos =
                    platform === "ios"
                      ? [
                          { left: "90%", top: "94%" },
                          { left: "74%", top: "57%" },
                          { left: "76%", top: "80%" },
                        ][i]
                      : [
                          { left: "93%", top: "13%" },
                          { left: "86%", top: "48%" },
                          { left: "92%", top: "66%" },
                        ][i];
                  return (
                    <figure key={i} className="flex flex-col items-center">
                      <span className="font-roboto text-sm font-medium text-[#C6A046]">
                        {m.label[lang]}
                      </span>
                      <div className="relative mt-2 w-full">
                        <img
                          src={m.url}
                          alt={m.alt[lang]}
                          width={1024}
                          height={1024}
                          loading="lazy"
                          className="h-auto w-full rounded-2xl border border-white/10 bg-[#F5EFE6]"
                        />
                        {platform === "android" && i === 0 && (
                          <>
                            <span
                              className="absolute h-8 w-8 rounded-full border-2 border-[#C04F17] shadow-[0_0_0_2px_rgba(255,255,255,0.95)]"
                              style={{ left: "93.7%", top: "7%", transform: "translate(-50%, -50%)" }}
                              aria-hidden="true"
                            />
                            <span
                              className="absolute w-0.5 bg-[#C04F17]"
                              style={{
                                left: "93.7%",
                                top: "8.6%",
                                height: "2.9%",
                                transform: "translateX(-50%)",
                              }}
                              aria-hidden="true"
                            />
                          </>
                        )}
                        <span
                          className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-[#C04F17] text-sm font-bold text-white shadow-md ${
                            platform === "android" && i === 0 ? "ring-2 ring-white" : ""
                          }`}
                          style={{
                            left: badgePos.left,
                            top: badgePos.top,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          {i + 1}
                        </span>
                      </div>
                    </figure>
                  );
                })}
              </div>
            ) : (
              <figure className="flex flex-col items-center">
                <img
                  src={MOCKUPS[platform].url}
                  alt={MOCKUPS[platform].alt[lang]}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="h-auto w-full rounded-2xl border border-white/10 bg-[#F5EFE6]"
                />
                <figcaption className="mt-3 text-center font-roboto text-xs italic text-white/60">
                  {MOCKUP_CAPTION[lang]}
                </figcaption>
              </figure>
            )}
          </div>
        </div>

        {/* ============ Écran 4 — Mise à jour & infos ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-5 pt-20 pb-24 text-center md:px-12"
          style={{ opacity: s4.opacity, transform: s4.transform, pointerEvents: s4.pointerEvents }}
          aria-hidden={s4.ariaHidden}
        >
          <p
            className="text-center text-[clamp(1.5rem,min(7.5vw,5vh),3.2rem)] uppercase leading-[1.12] tracking-tight"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              color: "transparent",
              WebkitTextStrokeWidth: "2px",
              WebkitTextStrokeColor: "#FFFFFF",
            }}
          >
            One World Morocco
          </p>

          {updateAvailable && (
            <div className="w-full max-w-md rounded-2xl border border-[rgba(198,160,70,.34)] bg-black/45 p-5 backdrop-blur">
              <p className="font-roboto text-sm text-white/90">
                <strong className="text-[#C6A046]">{t.updateBannerStrong}</strong>
                <br />
                {t.updateBannerText}
              </p>
              <button
                type="button"
                onClick={hardRefresh}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#C04F17] px-5 py-2.5 font-roboto text-sm font-medium text-white shadow-md transition hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                {t.updateNow}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={hardRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,160,70,.5)] bg-black/45 px-6 py-3 font-roboto text-sm font-medium text-white backdrop-blur transition hover:bg-black/60"
          >
            <Download className="h-4 w-4" />
            {t.checkUpdates}
          </button>
          <p className="font-roboto text-xs text-white/60">{t.checkUpdatesHint}</p>

          <div className="mt-4 space-y-2">
            <p className="font-roboto text-sm text-white/80">
              {t.urlToOpen}{" "}
              <a href="https://oneworldmorocco.com" className="text-[#C6A046] hover:underline">
                oneworldmorocco.com
              </a>
            </p>
            <p className="font-roboto text-xs text-white/60">{t.sameDataNote}</p>
          </div>
        </div>

        {/* ============ CTA Découvrir / Revenir ============ */}
        <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-center gap-10">
          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) - 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{
              opacity: current > 0 ? 1 : 0,
              pointerEvents: current > 0 ? "auto" : "none",
            }}
            tabIndex={current > 0 ? 0 : -1}
            aria-hidden={current === 0}
          >
            <ChevronUp className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
              {lang === "fr" ? "Revenir" : lang === "en" ? "Back" : "رجوع"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) + 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{
              opacity: current < SCREENS - 1 ? 1 : 0,
              pointerEvents: current < SCREENS - 1 ? "auto" : "none",
            }}
            tabIndex={current < SCREENS - 1 ? 0 : -1}
            aria-hidden={current === SCREENS - 1}
          >
            <ChevronDown className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
              {lang === "fr" ? "Découvrir" : lang === "en" ? "Discover" : "اكتشف"}
            </span>
          </button>
        </div>
      </section>
    </>
  );
};

export default Install;

