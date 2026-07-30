import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Crown, Loader2, Mail, Eye, EyeOff, Home, ArrowUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

const Club = () => {
  const { language } = useLanguage();
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
    return (
      <div className="min-h-screen bg-[#C04F17] text-white overflow-x-hidden">
        <HomeMindtripHeader alwaysWhite />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer variant="verified" />
      </div>
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

  return (
    <div className="min-h-screen bg-[#C04F17] text-white overflow-x-hidden">
      <HomeMindtripHeader alwaysWhite forceHamburger={!!user} customMobileLinks={clubMobileLinks} />

      {/* Hero — repris de la home : picture mobile/tablette/desktop + mockups flottants */}
      {!user && (
        <section className="club-hero relative min-h-[92vh] w-full overflow-hidden">
          <picture>
            <source media="(max-width: 767px)" srcSet={heroImageMobile} />
            <source media="(max-width: 1023px)" srcSet={heroImageTablet} />
            <img
              src={heroImageDesktop}
              alt="Maroc — riad, piscine et tagine, composition réalisme magique"
              className="absolute inset-0 h-full w-full object-cover will-change-transform lg:h-[120%]"
              style={{
                transform: `translate(calc(var(--mx, 0) * 12px), calc(var(--sy, 0) * 24px)) scale(1.05)`,
              }}
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
          <style>{`
            @keyframes heroPhoneFloat {
              0%, 100% { transform: translateY(calc(-50% - 8px)); }
              50% { transform: translateY(calc(-50% + 8px)); }
            }
            @media (prefers-reduced-motion: reduce) {
              section img[alt^="Application One World"] { animation: none !important; }
            }
          `}</style>

          {/* Auth card overlaid */}
          <div className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-24 flex flex-col items-center justify-center gap-8 min-h-[92vh]">
            {/* Member benefits heading + 6 CTA badges above auth card */}
            <div className="w-full max-w-3xl md:max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
                {t.benefits}
              </h2>
              <p className="text-sm sm:text-base text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
                {t.desc}
              </p>
              <div className="flex flex-col items-center sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl sm:max-w-4xl lg:max-w-5xl mx-auto">
                {t.badges.map((label, index) => (
                  <div
                    key={label}
                    className="club-badge-glass club-badge-shimmer inline-flex items-center justify-center gap-2 text-white px-5 sm:px-6 md:px-7 lg:px-8 py-2.5 rounded-full text-xs sm:text-sm md:text-sm lg:text-base font-semibold w-fit sm:w-full whitespace-nowrap"
                    style={{ "--shimmer-delay": `${index * 120}ms` } as React.CSSProperties}
                  >
                    <Check color="#00a896" />
                    <span className="relative z-10">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="club-badge-shimmer w-full max-w-md bg-[#ECD6B8]/60 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-white/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
              style={{ "--shimmer-delay": "720ms" } as React.CSSProperties}
            >


                {/* Tabs */}
                <div className="flex bg-[#ECD6B8] rounded-lg p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === "login" ? "bg-[#C04F17] text-white shadow-sm" : "text-[#C04F17] hover:text-[#C04F17]/80"}`}
                  >
                    {tx.loginTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === "register" ? "bg-[#C04F17] text-white shadow-sm" : "text-[#C04F17] hover:text-[#C04F17]/80"}`}
                  >
                    {tx.registerTab}
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2 text-white">{mode === "login" ? tx.loginTitle : t.register}</h2>
                {mode === "register" && <p className="text-center text-xs text-white mb-6 font-semibold">{t.required}</p>}

                {isRegistered ? (
                  <div className="text-center py-12">
                    <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-xl font-bold text-white mb-2">{t.successTitle}</p>
                    <p className="text-white/90">{t.successMsg}</p>
                  </div>
                ) : mode === "login" ? (
                  <div className="space-y-6">
                    <ClubSocialButtons redirectPath="/club" />

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-sm text-white font-semibold">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">{t.emailLabel}</label>
                        <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" className="bg-[#ECD6B8] text-black" />
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
                             className="bg-[#ECD6B8] text-black pr-10"
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
                        className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold uppercase tracking-wider py-6 text-base"
                      >
                        {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                        {tx.loginSubmit.toUpperCase()}
                      </Button>
                      
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ClubSocialButtons redirectPath="/club" />

                    {/* Separator */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-sm text-white font-semibold">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">
                            {t.firstName} <span className="text-white font-bold ml-1">*</span>
                          </label>
                          <Input value={form.first_name} onChange={handleChange("first_name")} required className="bg-[#ECD6B8] text-black" />
                        </div>
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">{t.lastName}</label>
                          <Input value={form.last_name} onChange={handleChange("last_name")} className="bg-[#ECD6B8] text-black" />
                        </div>
                      </div>


                      <div>
                        <label className="text-sm text-white font-semibold mb-1 block">
                          {t.emailLabel} <span className="text-white font-bold ml-1">*</span>
                        </label>
                        <Input type="email" value={form.email} onChange={handleChange("email")} required className="bg-[#ECD6B8] text-black" />
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
                            className="bg-[#ECD6B8] text-black pr-10"
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
                            className="bg-[#ECD6B8] text-black pr-10"
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
                          <Input type="tel" value={form.phone} onChange={handleChange("phone")} className="bg-[#ECD6B8] text-black" />
                        </div>
                        <div>
                          <label className="text-sm text-white font-semibold mb-1 block">{t.whatsappLabel}</label>
                          <Input type="tel" value={form.whatsapp} onChange={handleChange("whatsapp")} className="bg-[#ECD6B8] text-black" />
                        </div>
                      </div>


                      <p className="text-xs text-white font-semibold mb-2">{t.required}</p>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isFormValid}
                        className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90 font-semibold uppercase tracking-wider py-6 text-base"
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
          {/* end hero content */}
        </section>
      )}

      {user && (
        <main className={activeTab === "assistant" ? "" : "pb-40 md:pb-24"}>
          <section className="w-full pt-20 pb-12 px-4">
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
