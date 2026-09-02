import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { useSEO } from "@/hooks/useSEO";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";


const LABELS = {
  fr: {
    pageTitle: "Rejoindre One World Morocco — Devenir partenaire",
    heroAriaLabel: "Rejoindre One World Morocco",
    heroH1a: "Rejoignez le premier écosystème numérique",
    heroH1b: "éthique & solidaire",
    heroH1c: "au Maroc.",
    heroPara1: "Tourisme, commerce, artisanat, services et solidarité réunis dans une même plateforme à impact positif.",
    heroPara2: "Gagnez en visibilité auprès des voyageurs et habitants. Sans commission.",
    heroCheck1: "Consommez local",
    heroCheck2: "Voyagez autrement",
    heroCheck3: "Agissez pour tous",
    heroStat1: "🌍 Tout le Maroc",
    heroStat2: "🤝 Partenaires locaux",
    heroStat3: "✓ 0% de commission",
    heroCta: "REJOINDRE →",
    heroLoginCta: "Déjà inscrit ? Login",
    waysH2: "Quatre moyens puissants d'attirer plus de clients sans intermédiaire.",
    waysP: "Soyez référencé dans notre catalogue\u00a0et obtenez votre carte business avec QR code. Deux outils complémentaires pour convertir les utilisateurs en clients.",
    way1H3: "Publiez vos offres sur One World Morocco",
    way1Intro: "Soyez référencé dans notre catalogue et touchez les voyageurs et habitants qui découvrent des entreprises locales partout au Maroc.",
    way1Li1: "Soyez découvert by les voyageurs & habitants\u00a0de votre région",
    way1Li2label: "Référencé dans le catalogue :",
    way1Li3: "Plus de trafic et de réservations directes",
    way1Li4: "Mis en avant dans la recherche et dans l'agent IA",
    way1Li5: "Aucune commission sur les réservations",
    way1Tag: "Vos offres. Notre audience. Plus de réservations.",
    way2H3: "Créez vos cartes business (QR)",
    way2Intro: "Obtenez votre page personnelle et votre code QR. Quand les voyageurs sont devant vous, partagez-le et convertissez instantanément.",
    way2Li1: "Toutes vos canaux digitaux au même endroit",
    way2Li2label: "URL courte personnalisée :",
    way2Li3: "Partagez par code QR ou lien en un tap",
    way2Li4: "Mettez à jour offres, évènements, vidéos et photos à tout moment",
    way2Li5: "Profil vérifié inspire confiance aux clients",
    way2Cta: "En savoir +",
    way2Tag: "Votre carte. Votre QR. Plus de clients sur place.",
    way3H3: "Votre assistant IA",
    way3Intro: "Intégrez un assistant IA directement sur votre site pour répondre aux visiteurs 24/7, qualifier leurs demandes et booster vos conversions.",
    way3Li1: "Disponible 24/7 pour répondre à vos visiteurs",
    way3Li2: "Recherche & réponse vocale",
    way3Li3: "Répond en plusieurs langues automatiquement",
    way3Li4: "Qualifie les demandes et capture les leads",
    way3Li5: "Connaît vos offres, horaires et tarifs",
    way3Li6: "Intégration simple en quelques minutes",
    way3Tag: "Votre IA. Vos réponses. Plus de conversions.",
    way4H3: "Réseau social, engagez avec votre communauté",
    way4Intro: "Entretenez la relation avec vos clients, prospects et followers, poussez votre offre, actualité et évènements dans leur interface.",
    way4Li1: "Gardez le lien avec vos clients and followers",
    way4Li2: "Poussez offres, actualités et évènements",
    way4Li3: "Diffusez directement dans leur interface",
    way4Li4: "Fidélisez et engagez votre communauté",
    way4Li5: "Transformez vos followers en clients",
    way4Tag: "Votre communauté. Vos messages. Plus d'engagement.",
    hiwH2: "Comment fonctionne le programme de remises pour les utilisateurs de l'App ?",
    hiwP: "Trois étapes simples pour attirer plus de clients, sans commissions ni intermédiaires.",
    hiw1H3: "Inscrivez-vous et définissez la remise que vous souhaitez offrir",
    hiw1P: "Choisissez librement le pourcentage de remise accordé aux utilisateurs. Ajustable à tout moment depuis votre espace partenaire.",
    hiw2H3: "Nos abonnés voient votre offre dans l'application",
    hiw2P: "Votre entreprise gagne en visibilité auprès des voyageurs et habitants qui explorent One World Morocco partout au Maroc.",
    hiw3H3: "Les clients viennent directement chez vous, sans commissions",
    hiw3P: "Réservations en direct, tarifs transparents : vous gardez 100% de vos revenus, sans intermédiaire.",
    hiwBtn: "S'INSCRIRE",
    joinSubtitle: "REJOINDRE EN TANT QUE PARTENAIRE.",
    joinLead: "Abonnez-vous à One World Morocco en quelques étapes : enregistrez votre entreprise, définissez votre offre et commencez à attirer de nouveaux clients instantanément, sans frais cachés ni intermédiaires.",
    step1Label: "Étape 1",
    step1H3: "Remplissez le formulaire",
    step1P: "Fournissez le nom et les coordonnées de votre entreprise.",
    step2Label: "Étape 2",
    step2H3: "Définissez votre offre",
    step2P: "Vous pouvez la mettre à jour à tout moment.",
    step3Label: "Étape 3",
    step3H3: "Obtenez des clients",
    step3P: "Les voyageurs verront votre offre dans notre catalogue.",
    joinBtn: "S'INSCRIRE",
    whyH2: "Pourquoi les partenaires choisissent One World Morocco",
    whyP: "Une offre plus équitable que les OTA classiques — sans commission, sans intermédiaire.",
    cmpThFeature: "Fonctionnalité",
    cmpReco: "★ RECOMMANDÉ",
    cmpRow1Feature: "Commission + Avis Clients + Réseau social",
    cmpRow2Feature: "Avis Clients",
    cmpRow3Feature: "Réseau social",
    cmpRow4Feature: "Votre QR code",
    cmpRow5Feature: "Contact direct",
    cmpRow6Feature: "Carte business digitale",
    cmpRow7Feature: "Votre assistant IA",
    cmpRow8Feature: "URL courte personnalisée (oneworldmorocco.com/votrenom)",
    cmpRow9Feature: "Recherche & réponse vocale",
    cmpRow10Feature: "Vitesse de paiement",
    cmpRow10Us: "Instantané",
    cmpRow10Booking: "30–60 jours",
    cmpRow10Gyg: "2–4 semaines",
    cmpRow11Feature: "Votre système de paiement en ligne, sans intermédiaire (sous réserve d'acceptation par votre prestataire de paiement)",
    cmpRow12Feature: "Vous possédez les données client",
    cmpRow13Feature: "Liberté tarifaire",
    cmpUsOptional: "✓ Optionnel",
    cmpUsIncluded: "✓ Inclus",
    cmpUsFree: "✓ Gratuit",
    cmpUsYes: "✓ Oui",
    cmpNo: "✗ Non",
    cmpUs0: "0 %",
    whyBtn: "S'INSCRIRE",
  },
  en: {
    pageTitle: "Join One World Morocco — Become a Partner",
    heroAriaLabel: "Join One World Morocco",
    heroH1a: "Join the first",
    heroH1b: "ethical & inclusive",
    heroH1c: "digital ecosystem in Morocco.",
    heroPara1: "Tourism, commerce, crafts, services and solidarity united in a single positive-impact platform.",
    heroPara2: "Boost your visibility with travellers and locals. No commission.",
    heroCheck1: "Shop local",
    heroCheck2: "Travel differently",
    heroCheck3: "Act for everyone",
    heroStat1: "🌍 All of Morocco",
    heroStat2: "🤝 Local partners",
    heroStat3: "✓ 0% commission",
    heroCta: "JOIN →",
    heroLoginCta: "Already registered? Login",
    waysH2: "Four powerful ways to attract more customers with no middleman.",
    waysP: "Get listed in our catalogue\u00a0and receive your business card with QR code. Two complementary tools to turn users into customers.",
    way1H3: "Publish your offers on One World Morocco",
    way1Intro: "Get listed in our catalogue and reach travellers and locals discovering local businesses across Morocco.",
    way1Li1: "Be discovered by travellers & locals\u00a0in your region",
    way1Li2label: "Listed in the catalogue:",
    way1Li3: "More traffic and direct bookings",
    way1Li4: "Featured in search and the AI agent",
    way1Li5: "Zero commission on bookings",
    way1Tag: "Your offers. Our audience. More bookings.",
    way2H3: "Create your business cards (QR)",
    way2Intro: "Get your personal page and QR code. When travellers are right in front of you, share it and convert instantly.",
    way2Li1: "All your digital channels in one place",
    way2Li2label: "Personalised short URL:",
    way2Li3: "Share by QR code or link in one tap",
    way2Li4: "Update offers, events, videos and photos any time",
    way2Li5: "Verified profile builds customer trust",
    way2Cta: "Learn more",
    way2Tag: "Your card. Your QR. More on-site customers.",
    way3H3: "Your AI assistant",
    way3Intro: "Embed an AI assistant directly on your website to answer visitors 24/7, qualify leads and boost your conversions.",
    way3Li1: "Available 24/7 to answer your visitors",
    way3Li2: "Voice search & response",
    way3Li3: "Responds in multiple languages automatically",
    way3Li4: "Qualifies requests and captures leads",
    way3Li5: "Knows your offers, opening hours and prices",
    way3Li6: "Simple integration in minutes",
    way3Tag: "Your AI. Your answers. More conversions.",
    way4H3: "Social network — engage with your community",
    way4Intro: "Maintain the relationship with your customers, prospects and followers, push your offers, news and events into their feed.",
    way4Li1: "Stay connected with your customers and followers",
    way4Li2: "Push offers, news and events",
    way4Li3: "Broadcast directly into their interface",
    way4Li4: "Retain and engage your community",
    way4Li5: "Turn your followers into customers",
    way4Tag: "Your community. Your messages. More engagement.",
    hiwH2: "How does the discount programme for App users work?",
    hiwP: "Three simple steps to attract more customers, with no commissions or middlemen.",
    hiw1H3: "Sign up and set the discount you want to offer",
    hiw1P: "Freely choose the discount percentage granted to users. Adjustable at any time from your partner dashboard.",
    hiw2H3: "Our subscribers see your offer in the app",
    hiw2P: "Your business gains visibility among travellers and locals exploring One World Morocco across Morocco.",
    hiw3H3: "Customers come directly to you, with no commissions",
    hiw3P: "Direct bookings, transparent prices: you keep 100% of your revenue, with no middleman.",
    hiwBtn: "SIGN UP",
    joinSubtitle: "JOIN AS A PARTNER.",
    joinLead: "Subscribe to One World Morocco in a few steps: register your business, set your offer and start attracting new customers instantly, with no hidden fees or middlemen.",
    step1Label: "Step 1",
    step1H3: "Fill in the form",
    step1P: "Provide your business name and contact details.",
    step2Label: "Step 2",
    step2H3: "Set your offer",
    step2P: "You can update it at any time.",
    step3Label: "Step 3",
    step3H3: "Get customers",
    step3P: "Travellers will see your offer in our catalogue.",
    joinBtn: "SIGN UP",
    whyH2: "Why partners choose One World Morocco",
    whyP: "A fairer deal than classic OTAs — no commission, no middleman.",
    cmpThFeature: "Feature",
    cmpReco: "★ RECOMMENDED",
    cmpRow1Feature: "Commission + Customer Reviews + Social network",
    cmpRow2Feature: "Customer Reviews",
    cmpRow3Feature: "Social network",
    cmpRow4Feature: "Your QR code",
    cmpRow5Feature: "Direct contact",
    cmpRow6Feature: "Digital business card",
    cmpRow7Feature: "Your AI assistant",
    cmpRow8Feature: "Personalised short URL (oneworldmorocco.com/yourname)",
    cmpRow9Feature: "Voice search & response",
    cmpRow10Feature: "Payment speed",
    cmpRow10Us: "Instant",
    cmpRow10Booking: "30–60 days",
    cmpRow10Gyg: "2–4 weeks",
    cmpRow11Feature: "Your own online payment system, no middleman (subject to acceptance by your payment provider)",
    cmpRow12Feature: "You own the customer data",
    cmpRow13Feature: "Pricing freedom",
    cmpUsOptional: "✓ Optional",
    cmpUsIncluded: "✓ Included",
    cmpUsFree: "✓ Free",
    cmpUsYes: "✓ Yes",
    cmpNo: "✗ No",
    cmpUs0: "0 %",
    whyBtn: "SIGN UP",
  },
  ar: {
    pageTitle: "انضم إلى One World Morocco — كن شريكًا",
    heroAriaLabel: "انضم إلى One World Morocco",
    heroH1a: "انضم إلى أول نظام بيئي رقمي",
    heroH1b: "أخلاقي وتضامني",
    heroH1c: "في المغرب.",
    heroPara1: "السياحة والتجارة والحرف اليدوية والخدمات والتضامن في منصة واحدة ذات أثر إيجابي.",
    heroPara2: "عزِّز ظهورك أمام المسافرين والسكان المحليين. بدون عمولة.",
    heroCheck1: "استهلك محليًا",
    heroCheck2: "سافر بشكل مختلف",
    heroCheck3: "تصرّف من أجل الجميع",
    heroStat1: "🌍 المغرب بأكمله",
    heroStat2: "🤝 شركاء محليون",
    heroStat3: "✓ 0% عمولة",
    heroCta: "انضم ←",
    heroLoginCta: "مسجل بالفعل؟ تسجيل الدخول",
    waysH2: "أربع طرق فعّالة لجذب المزيد من العملاء بدون وسطاء.",
    waysP: "سجِّل في كتالوجنا\u00a0واحصل على بطاقة عملك مع رمز QR. أداتان متكاملتان لتحويل المستخدمين إلى عملاء.",
    way1H3: "انشر عروضك على One World Morocco",
    way1Intro: "سجِّل في كتالوجنا وتواصل مع المسافرين والسكان الذين يكتشفون الشركات المحلية في أرجاء المغرب.",
    way1Li1: "اكتشف من قِبل المسافرين والسكان\u00a0في منطقتك",
    way1Li2label: "مُدرج في الكتالوج:",
    way1Li3: "مزيد من الزيارات والحجوزات المباشرة",
    way1Li4: "مميَّز في نتائج البحث ووكيل الذكاء الاصطناعي",
    way1Li5: "صفر عمولة على الحجوزات",
    way1Tag: "عروضك. جمهورنا. المزيد من الحجوزات.",
    way2H3: "أنشئ بطاقات عملك (QR)",
    way2Intro: "احصل على صفحتك الشخصية ورمز QR. عندما يكون المسافرون أمامك مباشرةً، شاركه وحوِّلهم فورًا.",
    way2Li1: "جميع قنواتك الرقمية في مكان واحد",
    way2Li2label: "رابط قصير مخصص:",
    way2Li3: "شارك برمز QR أو رابط بنقرة واحدة",
    way2Li4: "حدِّث العروض والفعاليات والمقاطع والصور في أي وقت",
    way2Li5: "الملف الشخصي الموثَّق يبني ثقة العملاء",
    way2Cta: "اعرف المزيد",
    way2Tag: "بطاقتك. رمز QR الخاص بك. المزيد من العملاء في الموقع.",
    way3H3: "مساعدك بالذكاء الاصطناعي",
    way3Intro: "ادمج مساعدًا ذكيًا مباشرةً في موقعك للرد على الزوار 24/7 وتأهيل طلباتهم وتعزيز معدلات التحويل.",
    way3Li1: "متاح 24/7 للرد على زوارك",
    way3Li2: "بحث ورد صوتي",
    way3Li3: "يرد بلغات متعددة تلقائيًا",
    way3Li4: "يؤهّل الطلبات ويستقطب العملاء المحتملين",
    way3Li5: "يعرف عروضك وأوقات عملك وأسعارك",
    way3Li6: "تكامل بسيط في دقائق",
    way3Tag: "ذكاؤك الاصطناعي. إجاباتك. المزيد من التحويلات.",
    way4H3: "الشبكة الاجتماعية — تفاعل مع مجتمعك",
    way4Intro: "حافظ على علاقتك بعملائك والمتابعين، وادفع عروضك وأخبارك وفعالياتك إلى واجهتهم.",
    way4Li1: "ابقَ على تواصل مع عملائك ومتابعيك",
    way4Li2: "ادفع العروض والأخبار والفعاليات",
    way4Li3: "بثّ مباشرةً في واجهتهم",
    way4Li4: "عزِّز ولاء مجتمعك وتفاعله",
    way4Li5: "حوِّل متابعيك إلى عملاء",
    way4Tag: "مجتمعك. رسائلك. المزيد من التفاعل.",
    hiwH2: "كيف يعمل برنامج الخصومات لمستخدمي التطبيق؟",
    hiwP: "ثلاث خطوات بسيطة لاستقطاب المزيد من العملاء، بدون عمولات أو وسطاء.",
    hiw1H3: "سجِّل وحدِّد الخصم الذي تريد تقديمه",
    hiw1P: "اختر بحرية نسبة الخصم الممنوحة للمستخدمين. قابل للتعديل في أي وقت من لوحة تحكم الشريك.",
    hiw2H3: "يرى مشتركونا عرضك في التطبيق",
    hiw2P: "تكتسب شركتك ظهورًا أوسع بين المسافرين والسكان الذين يستكشفون One World Morocco في المغرب.",
    hiw3H3: "يأتي العملاء إليك مباشرةً بدون عمولات",
    hiw3P: "حجوزات مباشرة وأسعار شفافة: تحتفظ بـ100% من إيراداتك بدون وسيط.",
    hiwBtn: "سجِّل الآن",
    joinSubtitle: "انضم كشريك.",
    joinLead: "اشترك في One World Morocco في خطوات بسيطة: سجِّل شركتك، وحدِّد عرضك، وابدأ في استقطاب عملاء جدد فورًا بدون رسوم خفية أو وسطاء.",
    step1Label: "الخطوة 1",
    step1H3: "املأ النموذج",
    step1P: "أدخل اسم شركتك وبياناتها.",
    step2Label: "الخطوة 2",
    step2H3: "حدِّد عرضك",
    step2P: "يمكنك تحديثه في أي وقت.",
    step3Label: "الخطوة 3",
    step3H3: "احصل على عملاء",
    step3P: "سيرى المسافرون عرضك في كتالوجنا.",
    joinBtn: "سجِّل الآن",
    whyH2: "لماذا يختار الشركاء One World Morocco",
    whyP: "صفقة أكثر إنصافًا من وكالات السفر الإلكترونية التقليدية — بدون عمولة ولا وسيط.",
    cmpThFeature: "الميزة",
    cmpReco: "★ موصى به",
    cmpRow1Feature: "عمولة + آراء العملاء + شبكة اجتماعية",
    cmpRow2Feature: "آراء العملاء",
    cmpRow3Feature: "شبكة اجتماعية",
    cmpRow4Feature: "رمز QR الخاص بك",
    cmpRow5Feature: "تواصل مباشر",
    cmpRow6Feature: "بطاقة العمل الرقمية",
    cmpRow7Feature: "مساعدك بالذكاء الاصطناعي",
    cmpRow8Feature: "رابط قصير مخصص (oneworldmorocco.com/اسمك)",
    cmpRow9Feature: "بحث ورد صوتي",
    cmpRow10Feature: "سرعة الدفع",
    cmpRow10Us: "فوري",
    cmpRow10Booking: "30–60 يومًا",
    cmpRow10Gyg: "2–4 أسابيع",
    cmpRow11Feature: "نظام الدفع الإلكتروني الخاص بك بدون وسيط (رهنًا بقبول مزود الدفع لديك)",
    cmpRow12Feature: "أنت تمتلك بيانات العملاء",
    cmpRow13Feature: "حرية التسعير",
    cmpUsOptional: "✓ اختياري",
    cmpUsIncluded: "✓ مشمول",
    cmpUsFree: "✓ مجاني",
    cmpUsYes: "✓ نعم",
    cmpNo: "✗ لا",
    cmpUs0: "0 %",
    whyBtn: "سجِّل الآن",
  },
} as const;

const NAV = {
  fr: { discover: "Découvrir", back: "Revenir" },
  en: { discover: "Discover", back: "Back" },
  ar: { discover: "اكتشف", back: "رجوع" },
} as const;

const SCREENS = 4;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const Check = ({ color }: { color: string }) => (
  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.6" />
    <path d="M6.5 11.3l3 3 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Join = () => {
  const { language } = useLanguage();
  const L = (LABELS as any)[language] ?? LABELS.fr;
  const N = (NAV as any)[language] ?? NAV.fr;
  const navigate = useLocalizedNavigate();

  useSEO({
    title: "Rejoindre One World Morocco — Devenir partenaire",
    description:
      "Zéro commission, visibilité auprès des voyageurs et habitants, carte business QR et assistant IA : rejoignez l'écosystème One World Morocco.",
    canonical: "/join",
  });

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

  // Écran 2 : auto-fit — le contenu est mis à l'échelle pour tenir dans la
  // hauteur disponible, sans ascenseur (le scroll ne reste qu'un filet de
  // sécurité si même l'échelle plancher ne suffit pas).
  const s2OuterRef = useRef<HTMLDivElement | null>(null);
  const s2ContentRef = useRef<HTMLDivElement | null>(null);
  const s2CardsRef = useDragScroll<HTMLDivElement>();
  const [s2Fit, setS2Fit] = useState({ scale: 1, height: 0, scrollable: false });

  useLayoutEffect(() => {
    const outer = s2OuterRef.current;
    const content = s2ContentRef.current;
    if (!outer || !content) return;
    let raf = 0;
    const fit = () => {
      const cs = getComputedStyle(outer);
      const avail =
        outer.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const needed = content.scrollHeight;
      if (avail <= 0 || needed <= 0) return;
      const raw = Math.min(1, avail / needed);
      const scale = raw < 1 ? Math.max(raw, 0.55) : 1;
      // La boîte du wrapper vaut toujours l'espace disponible ; le scale est
      // appliqué au contenu (pas au wrapper) pour que le contenu scalé
      // (needed × scale) tienne exactement dans la boîte.
      const scrollable = needed * scale > avail + 1;
      setS2Fit((prev) =>
        Math.abs(prev.scale - scale) < 0.005 &&
        Math.abs(prev.height - avail) < 1 &&
        prev.scrollable === scrollable
          ? prev
          : { scale, height: avail, scrollable },
      );
    };
    fit();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(outer);
    ro.observe(content);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const inScrollable = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("[data-owm-scroll]");
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
      if (inScrollable(e.target)) return;
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

  const layer = (index: number) => {
    const d = progress - index;
    const opacity = clamp(1 - Math.abs(d) * 1.6, 0, 1);
    const active = Math.abs(d) < 0.45;
    return {
      opacity,
      transform: reduced ? undefined : `translateY(${d * -48}px)`,
      pointerEvents: active ? ("auto" as const) : ("none" as const),
      transition: reduced ? "none" : undefined,
      ariaHidden: !active,
    };
  };

  const s1 = layer(0);
  const s2 = layer(1);
  const s3 = layer(2);
  const s4 = layer(3);
  const current = Math.round(progress);

  const goSignup = () => navigate("/devenir-affilie");

  const MONT = { fontFamily: "'Montserrat', sans-serif" } as const;

  const ctaClass =
    "inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5";

  const VANITY = "oneworldmorocco.com/votrenom";

  const WAYS = [
    {
      n: "1",
      h: L.way1H3,
      intro: L.way1Intro,
      tag: L.way1Tag,
      lis: [L.way1Li1, `${L.way1Li2label} ${VANITY}`, L.way1Li3, L.way1Li4, L.way1Li5],
    },
    {
      n: "2",
      h: L.way2H3,
      intro: L.way2Intro,
      tag: L.way2Tag,
      lis: [L.way2Li1, `${L.way2Li2label} ${VANITY}`, L.way2Li3, L.way2Li4, L.way2Li5],
    },
    {
      n: "3",
      h: L.way3H3,
      intro: L.way3Intro,
      tag: L.way3Tag,
      lis: [L.way3Li1, L.way3Li2, L.way3Li3, L.way3Li4, L.way3Li5, L.way3Li6],
    },
    {
      n: "4",
      h: L.way4H3,
      intro: L.way4Intro,
      tag: L.way4Tag,
      lis: [L.way4Li1, L.way4Li2, L.way4Li3, L.way4Li4, L.way4Li5],
    },
  ];


  const HIW = [
    { n: "1", h: L.hiw1H3, p: L.hiw1P },
    { n: "2", h: L.hiw2H3, p: L.hiw2P },
    { n: "3", h: L.hiw3H3, p: L.hiw3P },
  ];

  const CMP_ROWS: { f: string; us: string; b: string; g: string }[] = [
    { f: L.cmpRow1Feature, us: L.cmpUs0, b: "15–25 %", g: "20–30 %" },
    { f: L.cmpRow2Feature, us: L.cmpUsIncluded, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow3Feature, us: L.cmpUsIncluded, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow4Feature, us: L.cmpUsYes, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow5Feature, us: L.cmpUsYes, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow6Feature, us: L.cmpUsFree, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow7Feature, us: L.cmpUsOptional, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow8Feature, us: L.cmpUsIncluded, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow9Feature, us: L.cmpUsIncluded, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow10Feature, us: L.cmpRow10Us, b: L.cmpRow10Booking, g: L.cmpRow10Gyg },
    { f: L.cmpRow11Feature, us: L.cmpUsYes, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow12Feature, us: L.cmpUsYes, b: L.cmpNo, g: L.cmpNo },
    { f: L.cmpRow13Feature, us: L.cmpUsYes, b: L.cmpNo, g: L.cmpNo },
  ];

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section
        ref={sectionRef}
        className="relative h-[100dvh] min-h-[560px] w-full touch-none overflow-hidden bg-[hsl(0_0%_4%)]"
      >
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

        {/* ============ Écran 1 — Hero ============ */}
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
            className="relative z-10 max-w-4xl text-center text-[26px] font-bold leading-[1.2] tracking-tight text-[#F4ECDF] sm:text-4xl md:text-5xl lg:text-[3.5rem]"
            style={MONT}
          >
            {L.heroH1a} <span className="text-[#ffc008]">{L.heroH1b}</span> {L.heroH1c}
          </h1>
          <p className="relative z-10 mt-5 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white md:text-[1.0625rem]">
            {L.heroPara1}
          </p>
          <p className="relative z-10 mt-2 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white/90 md:text-[1.0625rem]">
            {L.heroPara2}
          </p>

          <div className="relative z-10 mt-6 flex flex-col items-start gap-2 text-[14px] text-white/95 sm:flex-row sm:items-center sm:gap-6">
            <span className="inline-flex items-center gap-2"><Check color="#00a896" />{L.heroCheck1}</span>
            <span className="inline-flex items-center gap-2"><Check color="#00a896" />{L.heroCheck2}</span>
            <span className="inline-flex items-center gap-2"><Check color="#00a896" />{L.heroCheck3}</span>
          </div>

          <div className="relative z-10 mt-6 hidden items-center gap-0 rounded-full border border-[rgba(198,160,70,.34)] bg-black/40 px-2 py-2 text-[13px] backdrop-blur sm:inline-flex">
            <span className="border-r border-white/20 px-5 text-white">{L.heroStat1}</span>
            <span className="border-r border-white/20 px-5 text-white">{L.heroStat2}</span>
            <span className="px-5 text-white">{L.heroStat3}</span>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={goSignup} className={ctaClass} style={MONT}>
              {L.heroCta}
            </button>
            <button
              type="button"
              onClick={() => navigate("/affiliates")}
              className="inline-flex items-center gap-3 rounded-full bg-[#D4AF37] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-[#1a1a1a] shadow-lg transition-transform hover:-translate-y-0.5"
              style={MONT}
            >
              {L.heroLoginCta}
            </button>
          </div>
        </div>

        {/* ============ Écran 2 — Quatre moyens ============ */}
        <div
          ref={s2OuterRef}
          className={`absolute inset-0 z-10 flex flex-col items-center px-5 pt-20 pb-24 md:px-12 ${
            s2Fit.scrollable
              ? "overflow-y-auto justify-start"
              : "overflow-hidden justify-center"
          }`}
          data-owm-scroll={s2Fit.scrollable ? true : undefined}
          style={{ opacity: s2.opacity, transform: s2.transform, pointerEvents: s2.pointerEvents }}
          aria-hidden={s2.ariaHidden}
        >
          <div
            className="w-full max-w-6xl"
            style={
              !s2Fit.scrollable && s2Fit.scale < 1
                ? { height: s2Fit.height, overflow: "hidden" }
                : undefined
            }
          >
            <div
              ref={s2ContentRef}
              style={
                !s2Fit.scrollable && s2Fit.scale < 1
                  ? { transform: `scale(${s2Fit.scale})`, transformOrigin: "top center" }
                  : undefined
              }
            >
              <h2
                className="text-center text-[clamp(22px,3.4vw,38px)] font-medium leading-[1.14] text-[#F4ECDF]"
                style={MONT}
              >
                {L.waysH2}
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-center font-roboto text-[14px] text-white/80 md:text-[17px] lg:text-[19px]">
                {L.waysP}
              </p>

              <div
                ref={s2CardsRef}
                className="mt-6 grid gap-4 md:flex md:gap-4 md:overflow-x-auto md:scrollbar-hide md:pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {WAYS.map((w) => (
                  <article
                    key={w.n}
                    className="rounded-2xl border border-[rgba(198,160,70,.34)] bg-black/40 p-5 backdrop-blur md:w-[300px] md:shrink-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C6A046] text-[15px] font-bold text-black"
                        style={MONT}
                      >
                        {w.n}
                      </span>
                      <h3 className="text-[16px] font-semibold leading-snug text-[#F4ECDF] md:text-[18px]" style={MONT}>
                        {w.h}
                      </h3>
                    </div>
                    <p className="mt-3 font-roboto text-[13.5px] leading-relaxed text-white/85 md:text-[14.5px]">
                      {w.intro}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {w.lis.map((li) => (
                        <li key={li} className="flex items-start gap-2 font-roboto text-[13px] leading-snug text-white/90 md:text-[14px]">
                          <span className="mt-[2px] shrink-0"><Check color="#00a896" /></span>
                          <span>{li}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 border-t border-[rgba(198,160,70,.24)] pt-3 text-[13px] font-bold text-[#C6A046]" style={MONT}>
                      {w.tag}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============ Écran 3 — Comment ça marche ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s3.opacity, transform: s3.transform, pointerEvents: s3.pointerEvents }}
          aria-hidden={s3.ariaHidden}
        >
          <div className="scrollbar-hide max-h-full w-full max-w-5xl overflow-y-auto text-center" data-owm-scroll>
            <h2
              className="text-[clamp(22px,3.4vw,38px)] font-medium leading-[1.14] text-[#F4ECDF]"
              style={MONT}
            >
              {L.hiwH2}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-roboto text-[14px] text-white/80 md:text-[15px]">{L.hiwP}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {HIW.map((s) => (
                <article
                  key={s.n}
                  className="rounded-2xl border border-[rgba(198,160,70,.34)] bg-black/40 p-5 text-left backdrop-blur"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C04F17] text-[18px] font-bold text-white"
                    style={MONT}
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold leading-snug text-[#F4ECDF]" style={MONT}>
                    {s.h}
                  </h3>
                  <p className="mt-2 font-roboto text-[13.5px] leading-relaxed text-white/85">{s.p}</p>
                </article>
              ))}
            </div>

            <button type="button" onClick={goSignup} className={`mt-7 ${ctaClass}`} style={MONT}>
              {L.hiwBtn}
            </button>
          </div>
        </div>

        {/* ============ Écran 4 — Pourquoi nous (comparatif) ============ */}
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s4.opacity, transform: s4.transform, pointerEvents: s4.pointerEvents }}
          aria-hidden={s4.ariaHidden}
        >
          <div className="scrollbar-hide max-h-full w-full max-w-5xl overflow-y-auto text-center" data-owm-scroll>
            <h2
              className="text-[clamp(22px,3.4vw,38px)] font-medium leading-[1.14] text-[#F4ECDF]"
              style={MONT}
            >
              {L.whyH2}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl font-roboto text-[14px] text-white/80 md:text-[15px]">{L.whyP}</p>

            <div className="scrollbar-hide mt-5 overflow-x-auto rounded-2xl border border-[rgba(198,160,70,.34)] bg-black/40 p-2 backdrop-blur" data-owm-scroll>
              <table className="w-full min-w-[560px] border-collapse text-left font-roboto text-[12px] md:text-[13px]">
                <thead>
                  <tr className="text-white/70">
                    <th className="px-3 py-2 font-semibold">{L.cmpThFeature}</th>
                    <th className="px-3 py-2 text-center font-semibold text-[#C6A046]">
                      One World Morocco
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">Booking · TripAdvisor</th>
                    <th className="px-3 py-2 text-center font-semibold">GetYourGuide · Viator</th>
                  </tr>
                </thead>
                <tbody>
                  {CMP_ROWS.map((r) => (
                    <tr key={r.f} className="border-t border-white/10">
                      <td className="px-3 py-2 text-white/85">{r.f}</td>
                      <td className="px-3 py-2 text-center font-bold text-[#C6A046]">{r.us}</td>
                      <td className="px-3 py-2 text-center text-white/50">{r.b}</td>
                      <td className="px-3 py-2 text-center text-white/50">{r.g}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={goSignup} className={`mt-6 ${ctaClass}`} style={MONT}>
              {L.whyBtn}
            </button>
          </div>
        </div>

        {/* ============ CTA Découvrir / Revenir ============ */}
        <div className="absolute inset-x-0 bottom-5 z-20 flex items-end justify-center gap-10">
          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) - 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{ opacity: current > 0 ? 1 : 0, pointerEvents: current > 0 ? "auto" : "none" }}
            tabIndex={current > 0 ? 0 : -1}
            aria-hidden={current === 0}
          >
            <ChevronUp className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">{N.back}</span>
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
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">{N.discover}</span>
          </button>
        </div>
      </section>
    </>
  );
};

export default Join;
