import { useState, useEffect } from "react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Crown, Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import ClubDashboard from "@/components/ClubDashboard";
import type { User } from "@supabase/supabase-js";
import { useSEO } from "@/hooks/useSEO";
import ClubSocialButtons from "@/components/club/ClubSocialButtons";

const Club = () => {
  const { language } = useLanguage();
  useSEO({
    title: "Club – Rejoignez la communauté",
    description: "Rejoignez le Club ONE WORLD MOROCCO pour accéder à des avantages exclusifs et des recommandations personnalisées.",
    canonical: "/club",
  });
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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

  // Listen for auth state changes + fetch countries
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.from("countries").select("id, name_fr, name_en, name_ar, code").order("sort_order").then(({ data }) => {
      if (data) setCountries(data);
    });
    return () => subscription.unsubscribe();
  }, []);

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
      orSeparator: "ou",
      googleSignIn: "Continuer avec Google",
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
      orSeparator: "or",
      googleSignIn: "Continue with Google",
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
      orSeparator: "أو",
      googleSignIn: "المتابعة مع جوجل",
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
    orSeparator: "ou",
    googleSignIn: "Continuer avec Google",
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
    if (!form.nickname.trim() || !form.email.trim()) return;

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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin + "/club",
        },
      });

      if (authError) {
        if (authError.message?.includes("already registered")) {
          toast({ title: t.emailAlreadyUsed, variant: "destructive" });
          return;
        }
        throw authError;
      }

      const payload: Record<string, string> = {
        nickname: form.nickname.trim(),
        email: form.email.trim(),
      };
      if (authData.user?.id) (payload as any).user_id = authData.user.id;
      if (form.first_name.trim()) payload.first_name = form.first_name.trim();
      if (form.last_name.trim()) payload.last_name = form.last_name.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.country.trim()) payload.country = form.country.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.whatsapp.trim()) payload.whatsapp = form.whatsapp.trim();

      const { error } = await supabase.from("club_members" as any).insert(payload as any);
      if (error) throw error;

      setIsRegistered(true);
      toast({ title: t.successTitle, description: t.successMsg });
    } catch (err) {
      console.error("Club registration error:", err);
      toast({ title: t.errorMsg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = form.nickname.trim() && form.email.trim() && password.length >= 6 && password === confirmPassword;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <HomeMindtripHeader alwaysWhite />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />
      {/* Hero — full bleed from top of screen */}
      <section className="club-hero relative overflow-hidden text-primary-foreground min-h-[80vh] flex items-center justify-center px-4">
        <div
          className="club-hero-bg absolute inset-[-6%] bg-cover bg-center"
          style={{ backgroundImage: "url('/hero_magical_realism_v2.jpg')" }}
        />
        <div className="club-hero-halo absolute pointer-events-none" />
        <div className="club-hero-ember absolute pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/70 pointer-events-none" />
        <div className="club-hero-inner relative z-10 max-w-3xl mx-auto text-center py-20 pt-32">
          <Crown className="h-12 w-12 mx-auto mb-4 opacity-90 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">{t.title}</h1>
          <p className="text-lg opacity-95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">{t.subtitle}</p>
        </div>
      </section>

      <main className="pb-40 md:pb-24">



        <section className="max-w-3xl mx-auto px-4 py-12">
          {user ? (
            /* ===== Logged-in: Dashboard ===== */
            <div className="max-w-lg mx-auto">
              <ClubDashboard user={user} onLogout={handleLogout} />
            </div>
          ) : (
            /* ===== Not logged-in: Benefits + Registration ===== */
            <>
              <p className="text-muted-foreground text-center text-lg leading-relaxed mb-10">{t.desc}</p>

              <h2 className="text-2xl font-bold text-center mb-6 !font-sans !not-italic">{t.benefits}</h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-12">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-sm">
                    <Crown className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-card-foreground">{b}</span>
                  </div>
                ))}
              </div>

              <div className="max-w-lg mx-auto">
                {/* Tabs */}
                <div className="flex bg-muted rounded-lg p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tx.loginTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tx.registerTab}
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-center mb-2">{mode === "login" ? tx.loginTitle : t.register}</h2>
                {mode === "register" && <p className="text-center text-xs text-muted-foreground mb-6">{t.required}</p>}

                {isRegistered ? (
                  <div className="text-center py-12">
                    <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-xl font-bold text-foreground mb-2">{t.successTitle}</p>
                    <p className="text-muted-foreground">{t.successMsg}</p>
                  </div>
                ) : mode === "login" ? (
                  <div className="space-y-6">
                    <ClubSocialButtons redirectPath="/club" />

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="text-sm text-foreground font-semibold mb-1 block">{t.emailLabel}</label>
                        <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" />
                      </div>
                      <div>
                        <label className="text-sm text-foreground font-semibold mb-1 block">{t.passwordLabel}</label>
                        <div className="relative">
                          <Input
                            type={showLoginPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="pr-10"
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
                          className="text-sm text-primary hover:underline"
                        >
                          {isResetting ? "…" : tx.forgotPassword}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoggingIn || !loginEmail.trim() || !loginPassword}
                        className="w-full bg-gold text-black hover:bg-gold/90 font-semibold py-6 text-base"
                      >
                        {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                        {tx.loginSubmit}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        {tx.noAccount}{" "}
                        <button type="button" onClick={() => setMode("register")} className="text-primary hover:underline font-semibold">
                          {tx.registerTab}
                        </button>
                      </p>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ClubSocialButtons redirectPath="/club" />

                    {/* Separator */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-sm text-muted-foreground">{t.orSeparator}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.firstName}</label>
                          <Input value={form.first_name} onChange={handleChange("first_name")} />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.lastName}</label>
                          <Input value={form.last_name} onChange={handleChange("last_name")} />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-foreground font-semibold mb-1 block">
                          {t.nickname} <span className="text-destructive">*</span>
                        </label>
                        <Input value={form.nickname} onChange={handleChange("nickname")} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.cityLabel}</label>
                          <Input value={form.city} onChange={handleChange("city")} />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.countryLabel}</label>
                          <Select
                            value={form.country}
                            onValueChange={(val) => setForm(prev => ({ ...prev, country: val === "__none__" ? "" : val }))}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={t.countryLabel} />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="__none__">—</SelectItem>
                              {sortedCountries.map((c) => {
                                const flag = countryFlag(c.code);
                                const name = getCountryName(c);
                                return (
                                  <SelectItem key={c.id} value={name} textValue={name}>
                                    <span className="flex items-center gap-2">
                                      {flag && <span>{flag}</span>}
                                      <span>{name}</span>
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-foreground font-semibold mb-1 block">
                          {t.emailLabel} <span className="text-destructive">*</span>
                        </label>
                        <Input type="email" value={form.email} onChange={handleChange("email")} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-foreground font-semibold mb-1 block">
                            {t.passwordLabel} <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={6}
                              className="pr-10"
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
                          <label className="text-sm text-foreground font-semibold mb-1 block">
                            {t.confirmPasswordLabel} <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={6}
                              className="pr-10"
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
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-destructive">{t.passwordMismatch}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.phoneLabel}</label>
                          <Input type="tel" value={form.phone} onChange={handleChange("phone")} />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">{t.whatsappLabel}</label>
                          <Input type="tel" value={form.whatsapp} onChange={handleChange("whatsapp")} />
                        </div>
                      </div>


                      <p className="text-xs text-muted-foreground mb-2">{t.required}</p>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !isFormValid}
                        className="w-full bg-gold text-black hover:bg-gold/90 font-semibold py-6 text-base"
                      >
                        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Crown className="h-5 w-5 mr-2" />}
                        {t.submit}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Club;
