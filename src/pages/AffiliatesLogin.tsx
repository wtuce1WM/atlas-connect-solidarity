import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import FrontHeader from "@/components/front/FrontHeader";
import portraitVideoAsset from "@/assets/hero-home-portrait-20260830.mp4.asset.json";
import landscapeVideoAsset from "@/assets/hero-home-landscape-20260830.mp4.asset.json";
import portraitVideoPoster from "@/assets/hero-home-portrait-poster-20260830.jpg.asset.json";
import landscapeVideoPoster from "@/assets/hero-home-landscape-poster-20260830.jpg.asset.json";


const AffiliatesLogin = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 1/1)");
    const on = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
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
  }, [isPortrait, isCheckingAuth]);


  const translations = {
    fr: {
      title: "Espace Affiliés",
      subtitle: "Connectez-vous pour accéder à votre espace partenaire",
      email: "Email",
      password: "Mot de passe",
      login: "Se connecter",
      error: "Erreur de connexion",
      invalidCredentials: "Email ou mot de passe incorrect",
      welcome: "Bienvenue dans l'espace affiliés",
      forgotPassword: "Mot de passe oublié ?",
      resetSent: "Email envoyé",
      resetSentDesc: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      sendReset: "Envoyer le lien",
    },
    en: {
      title: "Affiliates Area",
      subtitle: "Sign in to access your partner dashboard",
      email: "Email",
      password: "Password",
      login: "Sign In",
      error: "Login Error",
      invalidCredentials: "Invalid email or password",
      welcome: "Welcome to the affiliates area",
      forgotPassword: "Forgot password?",
      resetSent: "Email sent",
      resetSentDesc: "If an account exists with this email, you will receive a reset link.",
      sendReset: "Send reset link",
    },
    ar: {
      title: "منطقة الشركاء",
      subtitle: "تسجيل الدخول للوصول إلى لوحة الشريك",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      login: "تسجيل الدخول",
      error: "خطأ في تسجيل الدخول",
      invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      welcome: "مرحبًا بك في منطقة الشركاء",
      forgotPassword: "نسيت كلمة المرور؟",
      resetSent: "تم الإرسال",
      resetSentDesc: "إذا كان هناك حساب بهذا البريد، ستتلقى رابط إعادة التعيين.",
      sendReset: "إرسال الرابط",
    },
  };

  const t = translations[language] || translations.fr;

  const redirectTarget = (() => {
    const raw = new URLSearchParams(window.location.search).get("redirect");
    return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  })();

  const redirectIfAffiliate = async (userId: string) => {
    if (redirectTarget) {
      const [{ data: affiliateRow }, { data: staff }, { data: studio }] = await Promise.all([
        supabase.from("affiliates").select("id").eq("user_id", userId).maybeSingle(),
        supabase.rpc("is_staff", { _user_id: userId }),
        supabase.rpc("has_role", { _user_id: userId, _role: "video_studio" as any }),
      ]);
      if (affiliateRow || staff || studio) {
        navigate(redirectTarget);
        return true;
      }
      return false;
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (affiliate) {
      navigate("/affiliates/presence");
      return true;
    }

    return false;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectIfAffiliate(session.user.id);
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setTimeout(() => {
          redirectIfAffiliate(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t.error,
          description: t.invalidCredentials,
          variant: "destructive",
        });
        return;
      }

      const isAffiliate = data.user ? await redirectIfAffiliate(data.user.id) : false;
      if (!isAffiliate) {
        await supabase.auth.signOut();
        toast({
          title: t.error,
          description: redirectTarget
            ? "Ce compte n'a pas accès à cette page. Demandez un accès à One World Morocco."
            : "Cet email correspond à un compte Club/utilisateur, pas à un compte affilié.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t.error,
        description: t.invalidCredentials,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ 
        title: t.error, 
        description: language === "en" ? "Please enter your email first" : language === "ar" ? "يرجى إدخال بريدك الإلكتروني أولاً" : "Veuillez d'abord saisir votre email", 
        variant: "destructive" 
      });
      return;
    }
    setIsSendingReset(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/affiliates/reset-password`,
      });
      toast({ title: t.resetSent, description: t.resetSentDesc });
    } catch (error: unknown) {
      toast({ title: t.error, description: error instanceof Error ? error.message : t.invalidCredentials, variant: "destructive" });
    } finally {
      setIsSendingReset(false);
    }
  };

  const bgVideo = (
    <>
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
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,5,4,.62) 0%, rgba(6,5,4,.48) 35%, rgba(6,5,4,.74) 75%, rgba(6,5,4,.92) 100%)",
        }}
      />
    </>
  );

  if (isCheckingAuth) {
    return (
      <section className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)]">
        {bgVideo}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </section>
    );
  }

  return (
    <>
      <FrontHeader fixed visible onLogoClick={() => navigate("/")} />
      <section className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden bg-[hsl(0_0%_4%)]">
        {bgVideo}

        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-24 pb-12 md:px-12">
          <div
            data-owm-scroll
            className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/25 bg-white/10 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8"
          >
            <h1
              className="text-center text-[26px] leading-tight text-[#F4ECDF] md:text-[2rem]"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
            >
              {t.title}
            </h1>
            <p className="mt-3 text-center font-roboto text-[14px] leading-relaxed text-white/85">
              {t.subtitle}
            </p>

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-gold"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/90">{t.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/25 text-white placeholder:text-white/50 focus-visible:ring-gold"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className="text-sm text-gold hover:text-gold/80 underline underline-offset-2"
                >
                  {isSendingReset ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                  {t.forgotPassword}
                </button>
              </div>
              <Button
                type="submit"
                className="w-full rounded-full bg-gold py-6 text-[12.5px] font-bold uppercase tracking-[0.16em] text-gold-foreground hover:bg-gold/90"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.login}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};


export default AffiliatesLogin;
