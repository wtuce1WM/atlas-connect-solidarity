import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Zap, Shield, Headphones, ChevronDown, ChevronUp } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

const SCREENS = 4;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const BecomeAffiliate = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useLocalizedNavigate();
  const [formLoading, setFormLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useSEO({
    title: "Devenir affilié",
    description: "Rejoignez le réseau ONE WORLD MOROCCO en tant qu'affilié et augmentez votre visibilité auprès des voyageurs.",
    canonical: "/become-affiliate",
  });

  const translations = {
    fr: {
      title: "Devenir affilié",
      subtitle: "Prenez le contrôle de votre présence numérique à l'heure de l'IA",
      description: "",
      pricingSubtitle: "Pas de frais cachés. Tout ce dont vous avez besoin pour développer votre visibilité.",
      offerBadge: "Offre de lancement",
      price: "Gratuit",
      priceSuffix: "pendant 3 mois",
      features: [
        "Fiche établissement complète",
        "Référencement sur toutes les pages",
        "Visibilité sur la carte interactive",
        "Badges et labels personnalisés",
        "Statistiques de consultation",
        "Redirection WhatsApp",
        "Accès au réseau de partenaires",
      ],
      cta: "Démarrer maintenant",
      personalSupport: "Accompagnement personnalisé inclus",
      formTitle: "Lancez votre visibilité maintenant.",
      formBadge1: "Mise en ligne rapide",
      formBadge2: "Sans engagement",
      formBadge3: "Support",
      labelName: "Nom de l'établissement *",
      labelFirstName: "Prénom *",
      labelLastName: "Nom *",
      labelPhone: "Téléphone *",
      labelEmail: "Email",
      labelCity: "Ville *",
      labelProjectName: "Nom de votre projet",
      labelWebsite: "Site Web",
      labelPaymentMethod: "Méthode de paiement",
      paymentOnline: "En ligne",
      paymentCheck: "Chèque",
      paymentTransfer: "Virement",
      paymentCash: "Espèces",
      labelMultipleListings: "Avez-vous besoin d'une seule fiche ou de publier plusieurs offres ?",
      optionSingle: "Une seule",
      optionMultiple: "Plusieurs",
      labelContentReady: "Votre texte et photos sont prêts pour commencer ?",
      optionYes: "Oui",
      optionNo: "Non",
      requiredNote: "* obligatoire",
      labelPaymentPlan: "Plan de paiement",
      paymentPlanFull: "Paiement complet",
      paymentPlanSplit: "Paiement en 2 fois",
      labelMessage: "Un message ? (optionnel)",
      submitBtn: "Envoyer ma demande",
      successMsg: "Merci ! Nous vous recontacterons rapidement.",
      discover: "Découvrir",
      back: "Revenir",
      featuresEyebrow: "Ce que vous obtenez",
      featuresTitle: "Une vitrine complète, sans commission.",
      pricingEyebrow: "Adhésion professionnelle",
      pricingTitle: "Un engagement, quatre paliers.",
      pricingLede: "Un abonnement mensuel, zéro commission, et 20% reversés à des causes humanitaires au Maroc — quel que soit votre palier.",
      heroCta: "Devenir affilié",
      month: "mois",
    },
    en: {
      title: "Become an affiliate",
      subtitle: "Take control of your digital presence in the age of AI",
      description: "",
      pricingSubtitle: "No hidden fees. Everything you need to grow your visibility.",
      offerBadge: "Launch offer",
      price: "Free",
      priceSuffix: "for 3 months",
      features: [
        "Complete business listing",
        "Referencing on all pages",
        "Visibility on the interactive map",
        "Custom badges and labels",
        "Consultation statistics",
        "WhatsApp redirection",
        "Access to the partner network",
      ],
      cta: "Start now",
      personalSupport: "Personalized support included",
      formTitle: "Launch your visibility now.",
      formBadge1: "Quick setup",
      formBadge2: "No commitment",
      formBadge3: "Support",
      labelName: "Business name *",
      labelFirstName: "First name *",
      labelLastName: "Last name *",
      labelPhone: "Phone *",
      labelEmail: "Email",
      labelCity: "City *",
      labelProjectName: "Project name",
      labelWebsite: "Website",
      labelPaymentMethod: "Payment method",
      paymentOnline: "Online",
      paymentCheck: "Check",
      paymentTransfer: "Bank transfer",
      paymentCash: "Cash",
      labelMultipleListings: "Do you need a single listing or do you want to publish multiple offers?",
      optionSingle: "Single",
      optionMultiple: "Multiple",
      labelContentReady: "Are your text and photos ready to start?",
      optionYes: "Yes",
      optionNo: "No",
      requiredNote: "* required",
      labelPaymentPlan: "Payment plan",
      paymentPlanFull: "Full payment",
      paymentPlanSplit: "Payment in 2 installments",
      labelMessage: "Any message? (optional)",
      submitBtn: "Send my request",
      successMsg: "Thank you! We'll get back to you shortly.",
      discover: "Discover",
      back: "Back",
      featuresEyebrow: "What you get",
      featuresTitle: "A complete showcase, zero commission.",
      pricingEyebrow: "Professional membership",
      pricingTitle: "One commitment, four tiers.",
      pricingLede: "A monthly subscription, zero commission, and 20% donated to humanitarian causes in Morocco — whichever tier you choose.",
      heroCta: "Become an affiliate",
      month: "month",
    },
    ar: {
      title: "كن شريكًا",
      subtitle: "سيطر على حضورك الرقمي في عصر الذكاء الاصطناعي",
      description: "",
      pricingSubtitle: "لا رسوم خفية. كل ما تحتاجه لتطوير رؤيتك.",
      offerBadge: "عرض الانطلاق",
      price: "مجاني",
      priceSuffix: "لمدة 3 أشهر",
      features: [
        "بطاقة مؤسسة كاملة",
        "إحالة على جميع الصفحات",
        "ظهور على الخريطة التفاعلية",
        "شارات وتسميات مخصصة",
        "إحصائيات الاستشارة",
        "إعادة توجيه واتساب",
        "الوصول إلى شبكة الشركاء",
      ],
      cta: "ابدأ الآن",
      personalSupport: "مرافقة شخصية مشمولة",
      formTitle: "أطلق رؤيتك الآن.",
      formBadge1: "إعداد سريع",
      formBadge2: "بدون التزام",
      formBadge3: "دعم",
      labelName: "اسم المؤسسة *",
      labelFirstName: "الاسم الأول *",
      labelLastName: "اللقب *",
      labelPhone: "الهاتف *",
      labelEmail: "البريد الإلكتروني",
      labelCity: "المدينة *",
      labelProjectName: "اسم مشروعك",
      labelWebsite: "الموقع الإلكتروني",
      labelPaymentMethod: "طريقة الدفع",
      paymentOnline: "عبر الإنترنت",
      paymentCheck: "شيك",
      paymentTransfer: "تحويل بنكي",
      paymentCash: "نقداً",
      labelMultipleListings: "هل تحتاج إلى بطاقة واحدة أم تريد نشر عروض متعددة؟",
      optionSingle: "واحدة",
      optionMultiple: "عدة",
      labelContentReady: "هل النصوص والصور جاهزة للبدء؟",
      optionYes: "نعم",
      optionNo: "لا",
      requiredNote: "* مطلوب",
      labelPaymentPlan: "خطة الدفع",
      paymentPlanFull: "دفع كامل",
      paymentPlanSplit: "دفع على مرتين",
      labelMessage: "رسالة؟ (اختياري)",
      submitBtn: "إرسال طلبي",
      successMsg: "شكراً! سنتواصل معك قريباً.",
      discover: "اكتشف",
      back: "رجوع",
      featuresEyebrow: "ما تحصل عليه",
      featuresTitle: "واجهة كاملة، بدون عمولة.",
      pricingEyebrow: "العضوية المهنية",
      pricingTitle: "التزام واحد، أربعة مستويات.",
      pricingLede: "اشتراك شهري، بدون عمولة، و 20% تذهب للقضايا الإنسانية في المغرب — أياً كان مستواك.",
      heroCta: "كن شريكًا",
      month: "شهر",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  const TIERS = [
    {
      name: language === "ar" ? "مايكرو" : "Micro",
      price: "20€",
      suffix: true,
      desc:
        language === "ar"
          ? "للمستقلين والمشاريع الصغيرة التي تنضم إلى واجهتنا الأخلاقية."
          : language === "en"
            ? "For freelancers and small businesses joining the ethical showcase."
            : "Pour l'indépendant et la petite structure qui rejoignent la vitrine éthique.",
      featured: false,
    },
    {
      name: language === "ar" ? "متوسط" : language === "en" ? "Intermediate" : "Intermédiaire",
      price: "50€",
      suffix: true,
      desc:
        language === "ar"
          ? "رؤية معززة للمؤسسات النامية."
          : language === "en"
            ? "Enhanced visibility for growing establishments."
            : "Visibilité renforcée pour les établissements en croissance.",
      featured: false,
    },
    {
      name: "Premium",
      price: "150 à 300€",
      suffix: true,
      desc:
        language === "ar"
          ? "إبراز ذو أولوية وتواجد تحريري على المنصة."
          : language === "en"
            ? "Priority featuring and editorial presence on the platform."
            : "Mise en avant prioritaire et présence éditoriale sur la plateforme.",
      featured: true,
    },
    {
      name: "Branding",
      price: language === "en" ? "On request" : language === "ar" ? "حسب الاتفاق" : "Selon accord",
      suffix: false,
      desc:
        language === "ar"
          ? "تنسيق مخصص للعلامات التجارية والمؤسسات السفيرة."
          : language === "en"
            ? "Tailored setup for ambassador brands and institutions."
            : "Dispositif sur-mesure pour les marques et institutions ambassadrices.",
      featured: false,
    },
  ];

  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    countryCode: "MA",
    projectName: "",
    website: "",
    paymentMethod: "",
    multipleListings: "",
    contentReady: "",
    paymentPlan: "",
    message: "",
  });

  const [countries, setCountries] = useState<{ code: string; label: string }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("code, name_fr, name_en")
        .order(language === "en" ? "name_en" : "name_fr");
      if (!alive || !data) return;
      setCountries(
        data
          .filter((c: any) => c.code)
          .map((c: any) => ({ code: c.code, label: (language === "en" ? c.name_en : c.name_fr) || c.name_fr || c.code })),
      );
    })();
    return () => { alive = false; };
  }, [language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.city.trim() || !form.email.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez remplir les champs obligatoires." });
      return;
    }
    setFormLoading(true);
    try {
      // 1. Crée l'entrée affilié (statut inactif) dans Back-office / B2B / Liste des Affiliés
      const { error: affiliateError } = await supabase.functions.invoke('submit-affiliate-request', {
        body: {
          businessName: form.businessName,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          city: form.city,
          countryCode: form.countryCode,
          country: countries.find((c) => c.code === form.countryCode)?.label || form.countryCode,
          projectName: form.projectName,
          website: form.website,
          paymentMethod: form.paymentMethod,
          multipleListings: form.multipleListings,
          contentReady: form.contentReady,
          paymentPlan: form.paymentPlan,
          message: form.message,
        },
      });
      if (affiliateError) console.error('affiliate request failed', affiliateError);

      // 2. Notification interne + accusé de réception au demandeur
      await supabase.functions.invoke('send-affiliate-request-emails', {
        body: {
          businessName: form.businessName,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email.trim(),
          city: form.city,
          website: form.website,
          multipleListings: form.multipleListings,
          contentReady: form.contentReady,
          message: form.message,
        },
      });

      setFormSubmitted(true);

    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setFormLoading(false);
    }
  };

  /* ============ Moteur d'écrans immersifs (modèle /corporate) ============ */
  const [progress, setProgress] = useState(0);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
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
    // Les zones marquées data-inner-scroll (formulaire, paliers) gardent leur scroll natif.
    const inInnerScroll = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-inner-scroll]");

    const onWheel = (e: WheelEvent) => {
      if (inInnerScroll(e.target)) return;
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
      touchYRef.current = inInnerScroll(e.target) ? null : (e.touches[0]?.clientY ?? null);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (inInnerScroll(e.target)) return;
      const y = e.touches[0]?.clientY ?? null;
      if (y === null || touchYRef.current === null) return;
      e.preventDefault();
      setTarget(targetRef.current + (touchYRef.current - y) / 320);
      touchYRef.current = y;
    };
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.getAttribute("role") === "combobox")) return;
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
      ariaHidden: !active,
    };
  };

  const s1 = layer(0);
  const s2 = layer(1);
  const s3 = layer(2);
  const s4 = layer(3);
  const current = Math.round(progress);

  const inputCls =
    "bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11";
  const labelCls = "block text-white/70 text-sm mb-1.5";

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
          <div className="relative z-10 flex flex-col items-center">
            <p
              className="mb-6 max-w-3xl text-center text-[13px] font-medium uppercase tracking-[0.18em] text-white/85 md:text-[16px] md:tracking-[0.22em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.title}
            </p>
            <h1
              className="max-w-4xl text-center text-[26px] leading-[1.2] text-[#F4ECDF] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              {t.subtitle}
            </h1>
            <p className="mt-5 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white md:text-[1.125rem]">
              {t.pricingSubtitle}
            </p>
            <button
              type="button"
              onClick={() => setTarget(3)}
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.heroCta}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ============ Écran 2 — Ce que vous obtenez ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s2.opacity, transform: s2.transform, pointerEvents: s2.pointerEvents }}
          aria-hidden={s2.ariaHidden}
        >
          <div className="w-full max-w-5xl">
            <span
              className="block text-[12px] uppercase tracking-[0.42em] text-[#C6A046]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.featuresEyebrow}
            </span>
            <h2
              className="mt-4 text-[clamp(22px,4vw,42px)] leading-[1.12] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              {t.featuresTitle}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {t.features.map((f) => (
                <div key={f} className="flex items-start gap-3 border-b border-white/10 py-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C6A046]" />
                  <span className="font-roboto text-[14px] leading-snug text-white/90 md:text-[15px]">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: Zap, label: t.formBadge1 },
                { icon: Shield, label: t.formBadge2 },
                { icon: Headphones, label: t.formBadge3 },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80"
                >
                  <Icon className="h-4 w-4 text-[#C6A046]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ============ Écran 3 — Adhésion professionnelle ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s3.opacity, transform: s3.transform, pointerEvents: s3.pointerEvents }}
          aria-hidden={s3.ariaHidden}
        >
          <div className="w-full max-w-6xl">
            <span
              className="block text-[12px] uppercase tracking-[0.42em] text-[#C6A046]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.pricingEyebrow}
            </span>
            <h2
              className="mt-4 text-[clamp(22px,4vw,42px)] leading-[1.12] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              {t.pricingTitle}
            </h2>
            <p className="mt-3 max-w-3xl font-roboto text-[14px] leading-relaxed text-white/80 md:text-[16px]">
              {t.pricingLede}
            </p>
            <div
              data-inner-scroll
              className="mt-6 grid max-h-[46vh] grid-cols-1 gap-px overflow-y-auto overscroll-contain rounded-xl border border-[#C6A046]/25 bg-[#C6A046]/10 sm:grid-cols-2 lg:grid-cols-4"
            >
              {TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative flex flex-col p-6 md:p-7 ${tier.featured ? "bg-[#1a1512]" : "bg-[hsl(0_0%_6%)]"}`}
                >
                  {tier.featured && (
                    <span className="absolute right-3 top-3 rounded bg-[#C6A046] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#2b2b2b]">
                      Signature
                    </span>
                  )}
                  <div className="mb-4 text-xs font-bold uppercase tracking-[0.26em] text-[#C6A046]">
                    {tier.name}
                  </div>
                  <div
                    className="mb-4 text-3xl font-bold leading-none text-white md:text-4xl"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {tier.price}
                    {tier.suffix && (
                      <small className="ml-1 text-sm font-normal text-white/70">/{t.month}</small>
                    )}
                  </div>
                  <p className="font-roboto text-sm leading-relaxed text-white/80">{tier.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ Écran 4 — Formulaire ============ */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-5 pt-20 pb-24 md:px-12"
          style={{ opacity: s4.opacity, transform: s4.transform, pointerEvents: s4.pointerEvents }}
          aria-hidden={s4.ariaHidden}
        >
          {formSubmitted ? (
            <div className="max-w-lg text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#C6A046]/20">
                <Check className="h-8 w-8 text-[#C6A046]" />
              </div>
              <h2
                className="mb-4 text-2xl text-[#F4ECDF] md:text-3xl"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
              >
                {language === 'ar' ? 'شكراً لتواصلكم' : language === 'en' ? 'Thank you for reaching out' : 'Merci de votre prise de contact'}
              </h2>
              <p className="font-roboto text-lg text-white/80">
                {language === 'ar' ? 'سنتواصل معكم في أقرب وقت.' : language === 'en' ? 'We will contact you as soon as possible.' : 'Nous vous contacterons au plus vite.'}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-lg">
              <h2
                className="text-center text-[clamp(20px,3.4vw,34px)] leading-tight text-[#F4ECDF]"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
              >
                {t.formTitle}
              </h2>
              <form
                onSubmit={handleSubmit}
                data-inner-scroll
                className="mt-4 max-h-[58vh] space-y-4 overflow-y-auto overscroll-contain pr-1"
              >
                <p className="font-roboto text-xs italic text-white/60">{t.requiredNote}</p>
                <div>
                  <label className={labelCls}>{t.labelName}</label>
                  <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={inputCls} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t.labelFirstName}</label>
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t.labelLastName}</label>
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t.labelPhone}</label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} type="tel" />
                  </div>
                  <div>
                    <label className={labelCls}>{t.labelEmail} *</label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} type="email" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t.labelCity}</label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.labelWebsite}</label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} type="url" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t.labelMultipleListings}</label>
                    <Select value={form.multipleListings} onValueChange={(val) => setForm({ ...form, multipleListings: val })}>
                      <SelectTrigger className="h-11 border-white/20 bg-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">{t.optionSingle}</SelectItem>
                        <SelectItem value="multiple">{t.optionMultiple}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={labelCls}>{t.labelContentReady}</label>
                    <Select value={form.contentReady} onValueChange={(val) => setForm({ ...form, contentReady: val })}>
                      <SelectTrigger className="h-11 border-white/20 bg-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{t.optionYes}</SelectItem>
                        <SelectItem value="no">{t.optionNo}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t.labelMessage}</label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="min-h-[90px] border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="h-12 w-full rounded-xl bg-gold text-base font-bold text-black shadow-lg shadow-gold/20 transition-all hover:bg-gold/90 hover:shadow-gold/40"
                >
                  {formLoading ? "..." : t.submitBtn}
                  {!formLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </div>
          )}
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
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">{t.back}</span>
          </button>

          <button
            type="button"
            onClick={() => setTarget(Math.round(progress) + 1)}
            className="flex flex-col items-center gap-1 text-[rgba(244,238,228,0.85)] hover:text-gold"
            style={{ opacity: current < SCREENS - 1 ? 1 : 0, pointerEvents: current < SCREENS - 1 ? "auto" : "none" }}
            tabIndex={current < SCREENS - 1 ? 0 : -1}
            aria-hidden={current === SCREENS - 1}
          >
            <ChevronDown className={`h-6 w-6 text-gold ${reduced ? "" : "animate-bounce"}`} />
            <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">{t.discover}</span>
          </button>
        </div>
      </section>
    </>
  );
};

export default BecomeAffiliate;
