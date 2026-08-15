import { useEffect, useState } from "react";
import { Crown, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackClubSignupStarted, trackClubSignupStep, trackClubSignupCompleted, trackClubSignupAbandoned } from "@/lib/analytics";
import ClubSocialButtons from "./ClubSocialButtons";


interface Props {
  redirectPath?: string;
  onSuccess?: () => void;
}

const T = {
  fr: {
    loginTab: "Se connecter", registerTab: "S'inscrire",
    loginTitle: "Accéder à votre compte", registerTitle: "Inscription au Club",
    or: "ou", email: "Email", password: "Mot de passe", confirmPassword: "Confirmer le mot de passe",
    nickname: "Pseudonyme", login: "Se connecter", register: "S'inscrire",
    forgot: "Mot de passe oublié ?", resetSent: "Email de réinitialisation envoyé.",
    loginError: "Email ou mot de passe incorrect.", error: "Une erreur est survenue.",
    pwShort: "Le mot de passe doit contenir au moins 6 caractères",
    pwMismatch: "Les mots de passe ne correspondent pas",
    emailUsed: "Cet email est déjà utilisé.",
    successTitle: "Bienvenue au Club OWM !",
    successMsg: "Un email de confirmation vous a été envoyé.",
    noAccount: "Pas encore membre ?", hasAccount: "Déjà membre ?", required: "* obligatoire",
  },
  en: {
    loginTab: "Sign in", registerTab: "Register",
    loginTitle: "Access your account", registerTitle: "Club Registration",
    or: "or", email: "Email", password: "Password", confirmPassword: "Confirm password",
    nickname: "Nickname", login: "Sign in", register: "Register",
    forgot: "Forgot password?", resetSent: "Reset email sent.",
    loginError: "Incorrect email or password.", error: "An error occurred.",
    pwShort: "Password must be at least 6 characters",
    pwMismatch: "Passwords do not match",
    emailUsed: "This email is already in use.",
    successTitle: "Welcome to the OWM Club!",
    successMsg: "A confirmation email has been sent.",
    noAccount: "Not a member yet?", hasAccount: "Already a member?", required: "* required",
  },
  ar: {
    loginTab: "تسجيل الدخول", registerTab: "تسجيل",
    loginTitle: "الوصول إلى حسابك", registerTitle: "التسجيل في النادي",
    or: "أو", email: "البريد الإلكتروني", password: "كلمة المرور", confirmPassword: "تأكيد كلمة المرور",
    nickname: "الاسم المستعار", login: "تسجيل الدخول", register: "تسجيل",
    forgot: "نسيت كلمة المرور؟", resetSent: "تم إرسال بريد الاستعادة.",
    loginError: "البريد أو كلمة المرور غير صحيحة.", error: "حدث خطأ.",
    pwShort: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل",
    pwMismatch: "كلمتا المرور غير متطابقتين",
    emailUsed: "هذا البريد الإلكتروني مستخدم بالفعل.",
    successTitle: "مرحباً بك في نادي OWM!",
    successMsg: "تم إرسال بريد تأكيد.",
    noAccount: "لست عضواً بعد؟", hasAccount: "عضو بالفعل؟", required: "* مطلوب",
  },
} as const;

const ClubAuthPanel = ({ redirectPath = "/", onSuccess }: Props) => {
  const { language } = useLanguage();
  const t = T[language as keyof typeof T] || T.fr;

  // Funnel: signup started on mount (entry to the auth surface)
  useEffect(() => {
    trackClubSignupStarted(redirectPath);
    return () => { trackClubSignupAbandoned("unmount"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setIsLoggingIn(false);
    if (error) toast({ title: t.loginError, variant: "destructive" });
    else onSuccess?.();
  };

  const handleForgot = async () => {
    if (!loginEmail.trim()) {
      toast({ title: t.email, variant: "destructive" });
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setIsResetting(false);
    if (error) toast({ title: t.error, variant: "destructive" });
    else toast({ title: t.resetSent });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !email.trim()) return;
    trackClubSignupStep("form_submitted", { method: "email" });
    if (password.length < 6) {
      toast({ title: t.pwShort, variant: "destructive" });
      trackClubSignupStep("validation_failed", { reason: "pw_short" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t.pwMismatch, variant: "destructive" });
      trackClubSignupStep("validation_failed", { reason: "pw_mismatch" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + redirectPath },
      });
      if (authError) {
        if (authError.message?.includes("already registered")) {
          toast({ title: t.emailUsed, variant: "destructive" });
          trackClubSignupStep("auth_error", { reason: "email_used" });
          return;
        }
        trackClubSignupStep("auth_error", { reason: authError.message?.slice(0, 80) });
        throw authError;
      }
      trackClubSignupStep("auth_user_created", { method: "email" });
      const payload: Record<string, string> = {
        nickname: nickname.trim(),
        email: email.trim(),
      };
      if (authData.user?.id) (payload as any).user_id = authData.user.id;
      const { data: inserted, error } = await (supabase
        .from("club_members" as any)
        .insert(payload as any)
        .select("id")
        .single() as any);
      if (error) throw error;
      // Email de bienvenue Club (une seule fois par membre, garde côté serveur)
      if (inserted?.id) {
        supabase.functions
          .invoke("send-club-welcome", { body: { member_id: inserted.id } })
          .catch((e) => console.error("send-club-welcome failed", e));
      }

      setIsRegistered(true);
      toast({ title: t.successTitle, description: t.successMsg });
      trackClubSignupCompleted("email");
    } catch (err) {
      console.error("Club registration error:", err);
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isRegistered) {
    return (
      <div className="text-center py-8">
        <Mail className="h-12 w-12 text-primary mx-auto mb-3" />
        <p className="text-base font-bold text-foreground mb-1">{t.successTitle}</p>
        <p className="text-sm text-muted-foreground">{t.successMsg}</p>
      </div>
    );
  }

  const isRegisterValid =
    nickname.trim() && email.trim() && password.length >= 6 && password === confirmPassword;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex bg-[#ECD6B8] rounded-lg p-1 mb-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === "login" ? "bg-[#C04F17] text-white shadow-sm" : "text-[#C04F17] hover:text-[#C04F17]/80"}`}
        >
          {t.loginTab}
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === "register" ? "bg-[#C04F17] text-white shadow-sm" : "text-[#C04F17] hover:text-[#C04F17]/80"}`}
        >
          {t.registerTab}
        </button>
      </div>

      <ClubSocialButtons redirectPath={redirectPath} onSuccess={onSuccess} />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-xs text-white font-semibold">{t.or}</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">{t.email}</label>
            <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" className="bg-white text-black" />
          </div>
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">{t.password}</label>
            <div className="relative">
              <Input
                type={showLoginPw ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-white text-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowLoginPw(!showLoginPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgot}
              disabled={isResetting}
              className="text-xs text-white hover:underline font-semibold"
            >
              {isResetting ? "…" : t.forgot}
            </button>
          </div>
          <Button
            type="submit"
            disabled={isLoggingIn || !loginEmail.trim() || !loginPassword}
            className="w-full text-white font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", backgroundColor: "#25D366" }}
          >
            {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
            {t.login.toUpperCase()}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">
              {t.nickname} <span className="text-white font-bold ml-1">*</span>
            </label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required className="bg-white text-black" />
          </div>
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">
              {t.email} <span className="text-white font-bold ml-1">*</span>
            </label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white text-black" />
          </div>
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">
              {t.password} <span className="text-white font-bold ml-1">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white text-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-white font-semibold mb-1 block">
              {t.confirmPassword} <span className="text-white font-bold ml-1">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPw2 ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white text-black pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw2(!showPw2)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">{t.pwMismatch}</p>
          )}
          <p className="text-xs text-white font-semibold">{t.required}</p>
          <Button
            type="submit"
            disabled={isSubmitting || !isRegisterValid}
            className="w-full text-white font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ fontFamily: "'Avenir Next','Avenir','Nunito Sans',system-ui,sans-serif", backgroundColor: "#25D366" }}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
            {t.register.toUpperCase()}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ClubAuthPanel;
