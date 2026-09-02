import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import FrontHeader from "@/components/front/FrontHeader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Crown, Loader2, Mail, Eye, EyeOff, Home, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { verifySession } from "@/hooks/useAuthSession";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import ClubDashboard from "@/components/ClubDashboard";
import ClubYoutubeRecommendations from "@/components/club/ClubYoutubeRecommendations";
import type { User } from "@supabase/supabase-js";
import { useSEO } from "@/hooks/useSEO";
import ClubSocialButtons from "@/components/club/ClubSocialButtons";
import ShareButton from "@/components/ShareButton";
import hamsaBlueAsset from "@/assets/hamsa-wall-blue.webp.asset.json";
import originalHeroAsset from "@/assets/hero-home-bg-naked-tinted-1920x1080.webp.asset.json";
import zelligeBrunAsset from "@/assets/backgr-brun-zelliges-2.webp.asset.json";
import phoneMockupAsset from "@/assets/phone-mockup-hero.webp.asset.json";
import iphoneTabletMockupAsset from "@/assets/og-install-app-v54-front-3q-minus45deg-1080x1920.webp.asset.json";
import koutoubiaVerticalBgAsset from "@/assets/hero-bg-koutoubia-zellige-vertical-tinted-v3-1080x1920.webp.asset.json";
import { useIsMobile } from "@/hooks/use-mobile";

const Check = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="flex-shrink-0 min-w-[22px] min-h-[22px]">
    <circle cx="11" cy="11" r="10" stroke={color} strokeWidth="1.6" />
    <path d="M6.5 11.3l3 3 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const heroImageDesktop = originalHeroAsset.url;
const heroImageTablet = zelligeBrunAsset.url;
const heroImageMobile = koutoubiaVerticalBgAsset.url;

const SCREENS = 4;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const Club = () => {
  const { language } = useLanguage();
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "assistant";
  useSEO({
    title: language === "en"
      ? "Club – Join the community"
      : language === "ar"
      ? "النادي – انضم إلى المجتمع"
      : "Club – Rejoignez la communauté",
    description: language === "en"
      ? "Join the ONE WORLD MOROCCO Club for exclusive benefits and personalised recommendations."
      : language === "ar"
      ? "انضم إلى نادي ONE WORLD MOROCCO للوصول إلى مزايا حصرية وتوصيات مخصصة."
      : "Rejoignez le Club ONE WORLD MOROCCO pour accéder à des avantages exclusifs et des recommandations personnalisées.",
    canonical: "/club",
  });
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nickname, setNickname] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [countries, setCountries] = useState<{ id: string; name_fr: string; name_en: string | null; name_ar: string | null; code: string | null }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    nickname: "",
    city: "",
    country: "",
    email: "",
    phone: "",
    whatsapp: "",
  });

  // Fetch nickname & avatar when user changes
  useEffect(() => {
    if (!user) {
      setNickname("");
      setAvatarUrl(null);
      setProfileData(null);
      return;
    }
    const fetchMemberData = async () => {
      const { data } = await (supabase
        .from("club_members" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle() as any);
      if (data) {
        let resolvedAvatarUrl = null;
        if (data.avatar_url) {
          const { data: signed } = await supabase.storage.from("club-avatars").createSignedUrl(data.avatar_url, 3600);
          if (signed?.signedUrl) {
            resolvedAvatarUrl = signed.signedUrl;
            setAvatarUrl(signed.signedUrl);
          }
        }
        if (data.nickname) setNickname(data.nickname);
        setProfileData({
          ...data,
          avatar_url: resolvedAvatarUrl || data.avatar_url
        });
      }
    };
    fetchMemberData();
  }, [user]);

  // Listen for auth state changes + fetch countries
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    // Vérification serveur : une session locale rejetée (bad_jwt, révoquée…) est purgée
    // au lieu d'afficher une UI "connectée" fantôme.
    verifySession().then(({ user: verifiedUser }) => {
      setUser(verifiedUser);
      setAuthLoading(false);
    });
    supabase.from("countries").select("id, name_fr, name_en, name_ar, code").order("sort_order").then(({ data }) => {
      if (data) setCountries(data);
    });
    return () => subscription.unsubscribe();
  }, []);


  // Ping "last activity" each time a logged-in member opens /club
  useEffect(() => {
    if (!user) return;
    (supabase as any).rpc("touch_club_member_activity").then(() => {}).catch(() => {});
  }, [user?.id]);


  // Scroll to top when user logs in (retry across paints to beat layout shifts / scroll restoration)
  useEffect(() => {
    if (!user) return;
    if ("scrollRestoration" in window.history) {
      try { window.history.scrollRestoration = "manual"; } catch {}
    }
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollTop();
    const r1 = requestAnimationFrame(scrollTop);
    const r2 = requestAnimationFrame(() => requestAnimationFrame(scrollTop));
    const t1 = setTimeout(scrollTop, 100);
    const t2 = setTimeout(scrollTop, 400);
    const t3 = setTimeout(scrollTop, 900);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [user]);

  // Hero parallax: mouse + scroll → CSS vars on .club-hero
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".club-hero");
    if (!hero) return;
    let mx = 0, my = 0, sy = 0, raf = 0;
    const apply = () => {
      hero.style.setProperty("--mx", mx.toFixed(3));
      hero.style.setProperty("--my", my.toFixed(3));
      hero.style.setProperty("--sy", sy.toFixed(3));
      raf = 0;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };
    const onScroll = () => {
      const r = hero.getBoundingClientRect();
      sy = Math.max(-1, Math.min(1, -r.top / Math.max(1, r.height)));
      schedule();
    };
    hero.addEventListener("mousemove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      hero.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // ===== Modèle immersif /corporate : 4 écrans en calques + navigation molette/tactile/clavier =====
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
  }, [isPortrait, user]);

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

  /** Saut direct à un écran, sans traverser les écrans intermédiaires. */
  const jumpTo = useCallback((v: number) => {
    const next = clamp(v, 0, SCREENS - 1);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetRef.current = next;
    currentRef.current = next;
    setProgress(next);
  }, []);



  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    // Les zones marquées data-owm-scroll (carte auth) conservent leur scroll natif.
    const inScrollable = (target: EventTarget | null) =>
      !!(target instanceof Element && target.closest("[data-owm-scroll]"));
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
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
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
  }, [setTarget, user, authLoading]);

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


  const countryFlag = (code: string | null) => {
    if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return null;
    return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)));
  };

  const getCountryName = (c: typeof countries[0]) => {
    if (language === "en" && c.name_en) return c.name_en;
    if (language === "ar" && c.name_ar) return c.name_ar;
    return c.name_fr;
  };

  const priorityCountries = ["Maroc", "France"];
  const sortedCountries = [...countries].sort((a, b) => {
    const aName = getCountryName(a);
    const bName = getCountryName(b);
    const aIdx = priorityCountries.indexOf(a.name_fr);
    const bIdx = priorityCountries.indexOf(b.name_fr);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return aName.localeCompare(bName);
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const t = {
    fr: {
      title: "Le Club OWM",
      platformHeadline: "Plateforme social video inspirationnelle direct-to-local",
      subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
      desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
      benefits: "Avantages membres",
      benefit1: "Réductions exclusives chez nos partenaires",
      benefit2: "Accès prioritaire aux événements",
      benefit3: "Offres spéciales et surprises",
      benefit4: "Newsletter personnalisée",
      register: "Inscription au Club",
      firstName: "Prénom",
      lastName: "Nom",
      nickname: "Pseudonyme",
      cityLabel: "Ville de résidence",
      countryLabel: "Pays de résidence",
      emailLabel: "Email",
      phoneLabel: "Téléphone",
      whatsappLabel: "WhatsApp",
      passwordLabel: "Mot de passe",
      confirmPasswordLabel: "Confirmer le mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas",
      passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
      submit: "S'inscrire",
      required: "* obligatoire",
      successTitle: "Bienvenue au Club OWM !",
      successMsg: "Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.",
      errorMsg: "Une erreur est survenue, veuillez réessayer.",
      emailAlreadyUsed: "Cet email est déjà utilisé.",
      rateLimit: "Trop de tentatives. Veuillez patienter 1 minute avant de réessayer.",
      weakPassword: "Le mot de passe est trop faible. Veuillez choisir un mot de passe plus sécurisé.",
      orSeparator: "ou",
      googleSignIn: "Continuer avec Google",
      badges: [
        "Votre assistant IA",
        "Votre ID numérique",
        "Découvrez, partagez",
        "Réductions exclusives",
        "Économie locale & solidaire",
        "Communauté OWM",
      ],
      backToTop: "Revenir",
    },
    en: {
      title: "The OWM Club",
      platformHeadline: "Social video inspiration platform, direct-to-local",
      subtitle: "Join the club and access exclusive benefits",
      desc: "As a One World Morocco Club member, enjoy discounts, special offers, and privileged access to the best establishments in Morocco.",
      benefits: "Member benefits",
      benefit1: "Exclusive discounts at our partners",
      benefit2: "Priority access to events",
      benefit3: "Special offers and surprises",
      benefit4: "Personalised newsletter",
      register: "Club Registration",
      firstName: "First name",
      lastName: "Last name",
      nickname: "Nickname",
      cityLabel: "City of residence",
      countryLabel: "Country of residence",
      emailLabel: "Email",
      phoneLabel: "Phone",
      whatsappLabel: "WhatsApp",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 6 characters",
      submit: "Register",
      required: "* required",
      successTitle: "Welcome to the OWM Club!",
      successMsg: "A confirmation email has been sent. Please check your inbox to activate your account.",
      errorMsg: "An error occurred, please try again.",
      emailAlreadyUsed: "This email is already in use.",
      rateLimit: "Too many attempts. Please wait 1 minute before trying again.",
      weakPassword: "Password is too weak. Please choose a stronger password.",
      orSeparator: "or",
      googleSignIn: "Continue with Google",
      badges: [
        "Your AI assistant",
        "Your digital ID",
        "Discover, share",
        "Exclusive discounts",
        "Local & community economy",
        "OWM Community",
      ],
      backToTop: "Back to top",
    },
    ar: {
      title: "نادي OWM",
      platformHeadline: "منصة فيديو اجتماعي للإلهام، مباشرة إلى المحلي",
      subtitle: "انضم إلى النادي واحصل على مزايا حصرية",
      desc: "بصفتك عضواً في نادي One World Morocco، استمتع بتخفيضات وعروض خاصة ووصول مميز لأفضل المؤسسات في المغرب.",
      benefits: "مزايا الأعضاء",
      benefit1: "تخفيضات حصرية لدى شركائنا",
      benefit2: "أولوية الوصول إلى الفعاليات",
      benefit3: "عروض خاصة ومفاجآت",
      benefit4: "نشرة إخبارية مخصصة",
      register: "التسجيل في النادي",
      firstName: "الاسم الأول",
      lastName: "اللقب",
      nickname: "الاسم المستعار",
      cityLabel: "مدينة الإقامة",
      countryLabel: "بلد الإقامة",
      emailLabel: "البريد الإلكتروني",
      phoneLabel: "الهاتف",
      whatsappLabel: "واتساب",
      passwordLabel: "كلمة المرور",
      confirmPasswordLabel: "تأكيد كلمة المرور",
      passwordMismatch: "كلمتا المرور غير متطابقتين",
      passwordTooShort: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل",
      submit: "تسجيل",
      required: "* مطلوب",
      successTitle: "مرحباً بك في نادي OWM!",
      successMsg: "تم إرسال بريد تأكيد. يرجى التحقق من صندوق الوارد لتفعيل حسابك.",
      errorMsg: "حدث خطأ، يرجى المحاولة مرة أخرى.",
      emailAlreadyUsed: "هذا البريد الإلكتروني مستخدم بالفعل.",
      rateLimit: "محاولات كثيرة جداً. يرجى الانتظار دقيقة واحدة قبل المحاولة مرة أخرى.",
      weakPassword: "كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى.",
      orSeparator: "أو",
      googleSignIn: "المتابعة مع جوجل",
      badges: [
        "مساعدك بالذكاء الاصطناعي",
        "هويتك الرقمية",
        "اكتشف وشارك",
        "تخفيضات حصرية",
        "اقتصاد محلي وتضامني",
        "مجتمع OWM",
      ],
      backToTop: "العودة للأعلى",
    },
  }[language] || {
    title: "Le Club OWM",
    platformHeadline: "Plateforme social video inspirationnelle direct-to-local",
    subtitle: "Rejoignez le club et accédez à des avantages exclusifs",
    desc: "En tant que membre du Club One World Morocco, vous bénéficiez de réductions, d'offres spéciales et d'un accès privilégié aux meilleurs établissements du Maroc.",
    benefits: "Avantages membres",
    benefit1: "Réductions exclusives chez nos partenaires",
    benefit2: "Accès prioritaire aux événements",
    benefit3: "Offres spéciales et surprises",
    benefit4: "Newsletter personnalisée",
    register: "Inscription au Club",
    firstName: "Prénom",
    lastName: "Nom",
    nickname: "Pseudonyme",
    cityLabel: "Ville de résidence",
    countryLabel: "Pays de résidence",
    emailLabel: "Email",
    phoneLabel: "Téléphone",
    whatsappLabel: "WhatsApp",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
    submit: "S'inscrire",
    required: "* obligatoire",
    successTitle: "Bienvenue au Club OWM !",
    successMsg: "Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte de réception pour activer votre compte.",
    errorMsg: "Une erreur est survenue, veuillez réessayer.",
    emailAlreadyUsed: "Cet email est déjà utilisé.",
    rateLimit: "Trop de tentatives. Veuillez patienter 1 minute avant de réessayer.",
    weakPassword: "Le mot de passe est trop faible. Veuillez choisir un mot de passe plus sécurisé.",
    orSeparator: "ou",
    googleSignIn: "Continuer avec Google",
    badges: [
      "Votre assistant IA",
      "Votre ID numérique",
      "Découvrez, partagez",
      "Réductions exclusives",
      "Économie locale & solidaire",
      "Communauté OWM",
    ],
    backToTop: "Revenir",
  };

  const benefits = [t.benefit1, t.benefit2, t.benefit3, t.benefit4];

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleGoogleSignIn = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/club",
    });
    if (error) {
      console.error("Google sign-in error:", error);
      toast({ title: t.errorMsg, variant: "destructive" });
    }
  };

  const tx = {
    fr: { loginTab: "Se connecter", registerTab: "S'inscrire", loginTitle: "Accéder à votre compte", loginSubmit: "Se connecter", loginError: "Email ou mot de passe incorrect.", forgotPassword: "Mot de passe oublié ?", resetSent: "Email de réinitialisation envoyé.", noAccount: "Pas encore de compte ?", hasAccount: "Déjà membre ?" },
    en: { loginTab: "Sign in", registerTab: "Register", loginTitle: "Access your account", loginSubmit: "Sign in", loginError: "Incorrect email or password.", forgotPassword: "Forgot password?", resetSent: "Reset email sent.", noAccount: "No account yet?", hasAccount: "Already a member?" },
    ar: { loginTab: "تسجيل الدخول", registerTab: "تسجيل", loginTitle: "الوصول إلى حسابك", loginSubmit: "تسجيل الدخول", loginError: "البريد أو كلمة المرور غير صحيحة.", forgotPassword: "نسيت كلمة المرور؟", resetSent: "تم إرسال بريد الاستعادة.", noAccount: "ليس لديك حساب؟", hasAccount: "عضو بالفعل؟" },
  }[language] || { loginTab: "Se connecter", registerTab: "S'inscrire", loginTitle: "Accéder à votre compte", loginSubmit: "Se connecter", loginError: "Email ou mot de passe incorrect.", forgotPassword: "Mot de passe oublié ?", resetSent: "Email de réinitialisation envoyé.", noAccount: "Pas encore de compte ?", hasAccount: "Déjà membre ?" };



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setIsLoggingIn(false);
    if (error) {
      toast({ title: tx.loginError, variant: "destructive" });
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      toast({ title: t.emailLabel, variant: "destructive" });
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setIsResetting(false);
    if (error) {
      toast({ title: t.errorMsg, variant: "destructive" });
    } else {
      toast({ title: tx.resetSent });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.email.trim()) return;

    if (password.length < 6) {
      toast({ title: t.passwordTooShort, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t.passwordMismatch, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin + "/club",
          data: {
            is_club_signup: true,
            nickname: form.first_name.trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim() || null,
            phone: form.phone.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
          },
        },
      });

      if (authError) {
        const errMsg = (authError.message || "").toLowerCase();
        const errCode = (authError as any).code || "";
        if (errMsg.includes("already registered") || errCode === "user_already_exists") {
          toast({ title: t.emailAlreadyUsed, variant: "destructive" });
          return;
        }
        if (errCode === "over_email_send_rate_limit" || errMsg.includes("for security purposes") || errMsg.includes("429")) {
          toast({ title: t.rateLimit, variant: "destructive" });
          return;
        }
        if (errCode === "weak_password" || errMsg.includes("weak password")) {
          toast({ title: t.weakPassword, variant: "destructive" });
          return;
        }
        throw authError;
      }

      setIsRegistered(true);
      toast({ title: t.successTitle, description: t.successMsg });
    } catch (err) {
      console.error("Club registration error:", err);
      toast({ title: t.errorMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  const isFormValid = form.first_name.trim() && form.email.trim() && password.length >= 6 && password === confirmPassword;

  if (authLoading) {
    // Écran d'attente neutre, aligné sur le fond immersif (évite le flash orange + footer).
    // Le header reste monté pour supprimer l'effet "reload" au changement de page.
    return (
      <>
        <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section
        className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)]"
        aria-busy="true"
      >
        <img
          src={isPortrait ? portraitVideoPoster.url : landscapeVideoPoster.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,5,4,.62) 0%, rgba(6,5,4,.48) 35%, rgba(6,5,4,.74) 75%, rgba(6,5,4,.92) 100%)",
          }}
        />
      </section>
      </>
    );
  }


  const clubMobileLinks = user
    ? [
        { label: language === "en" ? "AI Assistant" : language === "ar" ? "مساعد الذكاء" : "Assistant IA", to: "/club?tab=assistant" },
        { label: language === "en" ? "My account" : language === "ar" ? "حسابي" : "Mon compte", to: "/club?tab=account" },
        { label: language === "en" ? "My places" : language === "ar" ? "عناويني" : "Mes adresses", to: "/club?tab=addresses" },
        { label: language === "en" ? "Travel" : language === "ar" ? "سفر" : "Voyage", to: "/club?tab=travel" },
        { label: language === "en" ? "Inspiration" : language === "ar" ? "إلهام" : "Inspiration", to: "/club?tab=inspiration" },
        { label: language === "en" ? "AI conversations" : language === "ar" ? "محادثات الذكاء" : "Conversations IA", to: "/club?tab=ai-chats" },
        { label: language === "en" ? "Traveler profile" : language === "ar" ? "ملف المسافر" : "Profil de voyageur", to: "/club?tab=profile" },
        { label: language === "en" ? "Notifications" : language === "ar" ? "إشعارات" : "Notifications", to: "/club?tab=notifications" },
        { label: language === "en" ? "Contact us" : language === "ar" ? "اتصل بنا" : "Contactez-nous", to: "/club?tab=contact" },
        { label: language === "en" ? "Sign out" : language === "ar" ? "تسجيل الخروج" : "Se déconnecter", onClick: handleLogout, danger: true },
      ]
    : undefined;

  // ============ État déconnecté : modèle immersif 4 écrans (/corporate) ============
  if (!user) {
    const s1 = layer(0);
    const s2 = layer(1);
    const s3 = layer(2);
    const s4 = layer(3);
    const current = Math.round(progress);

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
            <p
              className="relative z-10 mb-6 max-w-3xl text-center text-[13px] font-medium uppercase tracking-[0.18em] text-white/85 md:text-[16px] md:tracking-[0.22em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {t.platformHeadline}
            </p>
            <h1
              className="relative z-10 max-w-4xl text-center text-[26px] leading-[1.2] text-[#F4ECDF] sm:text-[2.25rem] md:text-[3rem] lg:text-[3.5rem]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              {t.title}
              <br />
              <span className="font-bold text-[#C6A046]">{t.subtitle}</span>
            </h1>
            <p className="relative z-10 mt-5 max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-white md:text-[1.125rem]">
              {t.desc}
            </p>
            <button
              type="button"
              onClick={() => jumpTo(2)}
              className="relative z-10 mt-8 inline-flex items-center gap-3 rounded-full bg-[#C04F17] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <Crown className="h-4 w-4" />
              {t.register}
            </button>
          </div>

          {/* ============ Écran 2 — Avantages membres ============ */}
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-20 pb-24 md:px-12"
            style={{ opacity: s2.opacity, transform: s2.transform, pointerEvents: s2.pointerEvents }}
            aria-hidden={s2.ariaHidden}
          >
            <span
              className="block text-[12px] uppercase tracking-[0.42em] text-[#C6A046]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              One World Morocco
            </span>
            <h2
              className="mt-5 text-center text-[clamp(24px,4.6vw,48px)] leading-[1.12] text-[#F4ECDF]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
            >
              {t.benefits}
            </h2>

            <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {t.badges.map((label, index) => (
                <div
                  key={label}
                  className="club-badge-glass club-badge-shimmer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-semibold text-white sm:text-sm lg:text-base"
                  style={{ "--shimmer-delay": `${index * 120}ms` } as React.CSSProperties}
                >
                  <Check color="#00a896" />
                  <span className="relative z-10">{label}</span>
                </div>
              ))}
            </div>

            <ul className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 font-roboto text-[14px] text-white/90 md:text-[15px]">
                  <Check color="#C6A046" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ============ Écran 3 — Connexion / Inscription ============ */}
          <div
            className="absolute inset-0 z-10 flex items-start md:items-center justify-center px-4 pt-16 pb-16 md:px-12 md:pt-20 md:pb-20"
            style={{ opacity: s3.opacity, transform: s3.transform, pointerEvents: s3.pointerEvents }}
            aria-hidden={s3.ariaHidden}
          >
            <div className="w-full max-w-sm">
                {/* Tabs — bleu du popup Club OWM */}
                <div className="flex rounded-lg p-1 mb-3 bg-[#BED1FF]">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === "login" ? "bg-[#194CFF] text-white shadow-sm" : "text-[#194CFF] hover:text-[#194CFF]/80"}`}
                  >
                    {tx.loginTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${mode === "register" ? "bg-[#194CFF] text-white shadow-sm" : "text-[#194CFF] hover:text-[#194CFF]/80"}`}
                  >
                    {tx.registerTab}
                  </button>
                </div>


                {mode === "register" && <p className="text-center text-xs text-white mb-2 font-semibold">{t.required}</p>}

                {isRegistered ? (
                  <div className="text-center py-12">
                    <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-xl font-bold text-white mb-2">{t.successTitle}</p>
                    <p className="text-white/90">{t.successMsg}</p>
                  </div>
                ) : mode === "login" ? (
                  <div className="space-y-3">
                    <ClubSocialButtons redirectPath="/club" />

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-sm text-white font-semibold">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3">
                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">{t.emailLabel}</label>
                        <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" className="bg-[#BED1FF] text-black" />
                      </div>
                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">{t.passwordLabel}</label>
                        <div className="relative">
                           <Input
                             type={showLoginPassword ? "text" : "password"}
                             value={loginPassword}
                             onChange={(e) => setLoginPassword(e.target.value)}
                             required
                             autoComplete="current-password"
                             className="bg-[#BED1FF] text-black pr-10"
                           />
                           <button
                             type="button"
                             onClick={() => setShowLoginPassword(!showLoginPassword)}
                             className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                           >
                             {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={isResetting}
                          className="text-sm text-white hover:underline font-semibold"
                        >
                          {isResetting ? "…" : tx.forgotPassword}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoggingIn || !loginEmail.trim() || !loginPassword}
                        className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold uppercase tracking-wider py-4 text-base"
                      >
                        {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                        {tx.loginSubmit.toUpperCase()}
                      </Button>
                      
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <ClubSocialButtons redirectPath="/club" />

                    {/* Separator */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-sm text-white font-semibold">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">
                            {t.firstName} <span className="text-white font-bold ml-1">*</span>
                          </label>
                          <Input value={form.first_name} onChange={handleChange("first_name")} required className="bg-[#BED1FF] text-black" />
                        </div>
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">{t.lastName}</label>
                          <Input value={form.last_name} onChange={handleChange("last_name")} className="bg-[#BED1FF] text-black" />
                        </div>
                      </div>


                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">
                          {t.emailLabel} <span className="text-white font-bold ml-1">*</span>
                        </label>
                        <Input type="email" value={form.email} onChange={handleChange("email")} required className="bg-[#BED1FF] text-black" />
                      </div>

                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">
                          {t.passwordLabel} <span className="text-white font-bold ml-1">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="bg-[#BED1FF] text-black pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">
                          {t.confirmPasswordLabel} <span className="text-white font-bold ml-1">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="bg-[#BED1FF] text-black pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-destructive">{t.passwordMismatch}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">{t.phoneLabel}</label>
                          <Input type="tel" value={form.phone} onChange={handleChange("phone")} className="bg-[#BED1FF] text-black" />
                        </div>
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">{t.whatsappLabel}</label>
                          <Input type="tel" value={form.whatsapp} onChange={handleChange("whatsapp")} className="bg-[#BED1FF] text-black" />
                        </div>
                      </div>


                      <p className="text-xs text-white font-semibold mb-2">{t.required}</p>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isFormValid}
                        className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold uppercase tracking-wider py-4 text-base"
                      >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                        {t.submit.toUpperCase()}
                      </Button>
                    </form>
                  </div>
                )}
            </div>
            {/* end auth card */}
          </div>

          {/* ============ Écran 4 — Signature ============ */}
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-5 pt-20 pb-24 md:px-12"
            style={{ opacity: s4.opacity, transform: s4.transform, pointerEvents: s4.pointerEvents }}
            aria-hidden={s4.ariaHidden}
          >
            <p
              className="text-center text-[clamp(1.75rem,min(8.5vw,5.5vh),3.8rem)] uppercase leading-[1.12] tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, color: "transparent", WebkitTextStrokeWidth: "2px", WebkitTextStrokeColor: "#FFFFFF" }}
            >
              One World Morocco
            </p>
            <p className="max-w-2xl text-center font-roboto text-[15px] leading-relaxed text-[#F4EEE4] md:text-[1.125rem]">
              {t.platformHeadline}
            </p>
            <p
              className="text-center text-[clamp(1.75rem,min(8.5vw,5.5vh),3.8rem)] uppercase leading-[1.12] tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, color: "transparent", WebkitTextStrokeWidth: "2px", WebkitTextStrokeColor: "#FFFFFF" }}
            >
              <span className="block">LOCAL</span>
              <span className="block">DIGITAL</span>
              <span className="block">SOLIDAIRE</span>
            </p>
            <button
              type="button"
              onClick={() => jumpTo(2)}
              className="inline-flex items-center gap-3 rounded-full bg-[#25D366] px-9 py-4 text-[12.5px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <Crown className="h-4 w-4" />
              {t.register}
            </button>
          </div>

          {/* ============ Navigation verticale ============ */}
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
              <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
                {language === "en" ? "Back" : language === "ar" ? "رجوع" : "Revenir"}
              </span>
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
              <span className="font-roboto text-xs font-bold uppercase tracking-[0.18em]">
                {language === "en" ? "Discover" : language === "ar" ? "اكتشف" : "Découvrir"}
              </span>
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#C04F17] text-white overflow-x-hidden">
      <HomeMindtripHeader alwaysWhite forceHamburger={!!user} customMobileLinks={clubMobileLinks} />

      {user && (

        <main className={activeTab === "assistant" ? "" : "pb-40 md:pb-24"}>
          {/* Identité de session : l'utilisateur voit toujours avec quel compte il est connecté */}
          <div className="w-full pt-20 px-4">
            <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/25 bg-black/20 px-4 py-2 text-xs sm:text-sm">
              <span className="text-white/85 truncate">
                {language === "en" ? "Signed in as" : language === "ar" ? "متصل باسم" : "Connecté en tant que"}{" "}
                <strong className="text-white break-all">{user.email || user.phone}</strong>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 underline underline-offset-2 text-white/80 hover:text-white"
              >
                {language === "en" ? "Sign out" : language === "ar" ? "تسجيل الخروج" : "Se déconnecter"}
              </button>
            </div>
          </div>
          <section className="w-full pt-6 pb-12 px-4">
            <div className="w-full">
              <ClubDashboard user={user} onLogout={handleLogout} />
            </div>
          </section>

          {activeTab !== "assistant" && (
            <div className="flex justify-center pb-8">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label={t.backToTop}
                className="text-white/70 transition hover:text-white"
              >
                <ArrowUp className="mx-auto mb-2 h-5 w-5 animate-bounce" />
                <span className="block font-josefin text-xs uppercase tracking-[0.3em]">{t.backToTop}</span>
              </button>
            </div>
          )}
        </main>
      )}
      {user && activeTab !== "assistant" && <ClubYoutubeRecommendations />}
      <Footer variant="verified" />
      <ClubBottomBarSlot />

    </div>
  );
};

// Hides HomeBottomBar (4 CTAs) when the ClubAiAssistant opens a business slide-panel
// (which renders its own PanelSearchBar with 6 CTAs at the bottom).
const ClubBottomBarSlot = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => setPanelOpen(!!(e as CustomEvent).detail?.open);
    window.addEventListener("club:panel", handler as EventListener);
    return () => window.removeEventListener("club:panel", handler as EventListener);
  }, []);
  if (panelOpen) return null;
  return <HomeBottomBar />;
};

export default Club;
