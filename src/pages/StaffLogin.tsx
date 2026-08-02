import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";

const hasBackofficeAccess = (roles: Array<{ role: string }> | null | undefined) =>
  !!roles?.some((r) => r.role === "admin" || r.role === "staff");

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in and has staff role
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        
        if (hasBackofficeAccess(roles as Array<{ role: string }> | null | undefined)) {
          navigate("/staff/backoffice");
        } else {
          await supabase.auth.signOut();
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check if user has staff or admin role
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        if (rolesError) {
          throw rolesError;
        }

        if (!hasBackofficeAccess(roles as Array<{ role: string }> | null | undefined)) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Vous n'avez pas les droits staff/admin pour accéder au backoffice.",
          });
          return;
        }

        toast({
          title: "Connexion réussie",
          description: "Bienvenue dans le backoffice WTUCE.",
        });
        navigate("/staff/backoffice");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message === "Invalid login credentials" 
          ? "Email ou mot de passe incorrect." 
          : error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez d'abord saisir votre email.",
      });
      return;
    }
    setIsSendingReset(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/staff/login`,
      });
      toast({
        title: "Email envoyé",
        description: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-4 pt-24">
      <HomeMindtripHeader />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 mb-6">
            <img src={logoGold} alt="WTUCE Logo" className="h-12 w-12 object-contain" />
            <span className="font-serif text-2xl font-bold">
              <span className="text-gold">ONE WORLD</span> <span className="text-background">MOROCCO</span>
            </span>
          </a>
          <h1 className="text-2xl font-bold text-background mb-2">Espace Staff</h1>
          <p className="text-background/60">Connectez-vous pour accéder au backoffice</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-background/5 backdrop-blur-sm rounded-xl p-8 border border-background/10">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-background">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@wtuce.org"
                required
                className="pl-10 bg-background/10 border-background/20 text-background placeholder:text-background/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-background">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-10 pr-10 bg-background/10 border-background/20 text-background placeholder:text-background/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-background/40 hover:text-background"
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
              Mot de passe oublié ?
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold/90 text-gold-foreground font-semibold"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-background/60 hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
