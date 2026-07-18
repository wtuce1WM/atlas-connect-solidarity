import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Lock, Mail, Eye, EyeOff } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import logoGold from "@/assets/logoGOLDsimple.webp";

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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/affiliates/presence");
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/affiliates/presence");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: t.error,
          description: t.invalidCredentials,
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
    } catch (error: any) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
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
                  <Users className="h-8 w-8 text-gold" />
                </div>
              </div>
              <div className="flex justify-center">
                <img src={logoGold} alt="Logo" className="h-12 w-12 object-contain" />
              </div>
              <CardTitle className="text-2xl text-foreground">{t.title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">{t.email}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-background border-border"
                      required
                    />
                  </div>
                </div>
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {t.login}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliatesLogin;
