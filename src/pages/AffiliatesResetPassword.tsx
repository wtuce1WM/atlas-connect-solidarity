import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import logoGold from "@/assets/logoGOLDsimple.webp";

const AffiliatesResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  const translations = {
    fr: {
      title: "Nouveau mot de passe",
      subtitle: "Définissez votre nouveau mot de passe",
      password: "Nouveau mot de passe",
      confirm: "Confirmer le mot de passe",
      submit: "Mettre à jour",
      success: "Mot de passe mis à jour",
      successDesc: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
      error: "Erreur",
      mismatch: "Les mots de passe ne correspondent pas",
      tooShort: "Le mot de passe doit contenir au moins 6 caractères",
      invalidLink: "Lien invalide",
      invalidLinkDesc: "Ce lien de réinitialisation est invalide ou a expiré. Veuillez en demander un nouveau.",
      backToLogin: "Retour à la connexion",
      resendTitle: "Recevoir un nouveau lien",
      resendPlaceholder: "Votre adresse email",
      resendCta: "M'envoyer un lien",
      resendDone: "Lien envoyé — vérifiez votre boîte email (valable 1 heure).",
    },
    en: {
      title: "New Password",
      subtitle: "Set your new password",
      password: "New password",
      confirm: "Confirm password",
      submit: "Update",
      success: "Password updated",
      successDesc: "You can now sign in with your new password.",
      error: "Error",
      mismatch: "Passwords do not match",
      tooShort: "Password must be at least 6 characters",
      invalidLink: "Invalid link",
      invalidLinkDesc: "This reset link is invalid or expired. Please request a new one.",
      backToLogin: "Back to login",
      resendTitle: "Get a new link",
      resendPlaceholder: "Your email address",
      resendCta: "Send me a link",
      resendDone: "Link sent — check your inbox (valid for 1 hour).",
    },
    ar: {
      title: "كلمة مرور جديدة",
      subtitle: "حدد كلمة المرور الجديدة",
      password: "كلمة المرور الجديدة",
      confirm: "تأكيد كلمة المرور",
      submit: "تحديث",
      success: "تم تحديث كلمة المرور",
      successDesc: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      error: "خطأ",
      mismatch: "كلمتا المرور غير متطابقتين",
      tooShort: "يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل",
      invalidLink: "رابط غير صالح",
      invalidLinkDesc: "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.",
      backToLogin: "العودة لتسجيل الدخول",
      resendTitle: "الحصول على رابط جديد",
      resendPlaceholder: "بريدك الإلكتروني",
      resendCta: "أرسل لي رابطًا",
      resendDone: "تم إرسال الرابط — تحقق من بريدك (صالح لمدة ساعة).",
    },
  };

  const t = translations[language] || translations.fr;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecovery(true);
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(hash);
      const search = url.searchParams;

      // Error returned by Supabase in the hash
      if (hashParams.get("error")) return;

      // Legacy implicit flow: tokens directly in the hash
      if (hashParams.get("type") === "recovery" || hashParams.get("access_token")) {
        setIsRecovery(true);
        return;
      }

      // PKCE flow: ?code=...
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setIsRecovery(true);
        return;
      }

      // OTP flow: ?token_hash=...&type=recovery
      const tokenHash = search.get("token_hash");
      const type = search.get("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          type: type as "recovery",
          token_hash: tokenHash,
        });
        if (!error) setIsRecovery(true);
        return;
      }

      // Already signed in via recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setIsRecovery(true);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: t.error, description: t.tooShort, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t.error, description: t.mismatch, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: t.success, description: t.successDesc });
      await supabase.auth.signOut();
      setTimeout(() => navigate("/affiliates"), 1500);
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
    <div className="min-h-screen bg-black">
      <HomeMindtripHeader />
      <main className="container mx-auto px-4 pt-32 pb-16">
          <div className="flex flex-col items-center justify-center">
            <Card className="w-full max-w-md bg-card border-border">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-destructive/20 p-4">
                    <KeyRound className="h-8 w-8 text-destructive" />
                  </div>
                </div>
                <CardTitle className="text-xl text-foreground">{t.invalidLink}</CardTitle>
                <CardDescription className="text-muted-foreground">{t.invalidLinkDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gold text-gold-foreground hover:bg-gold/90" onClick={() => navigate("/affiliates")}>
                  {t.backToLogin}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer variant="affiliate" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <HomeMindtripHeader />
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="flex flex-col items-center justify-center">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-gold/20 p-4">
                  <KeyRound className="h-8 w-8 text-gold" />
                </div>
              </div>
              <div className="flex justify-center">
                <img src={logoGold} alt="Logo" className="h-12 w-12 object-contain" />
              </div>
              <CardTitle className="text-2xl text-foreground">{t.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{t.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">{t.password}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background border-border"
                      required
                      minLength={6}
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
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-foreground">{t.confirm}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-background border-border"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gold text-gold-foreground hover:bg-gold/90" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t.submit}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer variant="affiliate" />
    </div>
  );
};

export default AffiliatesResetPassword;
