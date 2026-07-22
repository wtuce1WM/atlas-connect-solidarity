import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Eye, EyeOff, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

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
    },
  } as const;

  const t = translations[language] || translations.fr;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    // If user already has a session from the recovery link
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsRecovery(true);
    });

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
      setTimeout(() => navigate("/club"), 1500);
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/20 p-4">
                <KeyRound className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-xl">{t.invalidLink}</CardTitle>
            <CardDescription>{t.invalidLinkDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/club")}>{t.backToLogin}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/20 p-4">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
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
              <Label htmlFor="confirm">{t.confirm}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.submit}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
