import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import logoGold from "@/assets/logoGOLD.webp";

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
        
        if (roles && roles.length > 0) {
          navigate("/staff/backoffice");
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

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Accès refusé",
            description: "Vous n'avez pas les droits d'accès au backoffice.",
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

  return (
    <div className="min-h-screen bg-foreground flex flex-col items-center justify-center px-4">
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-10 bg-background/10 border-background/20 text-background placeholder:text-background/40"
              />
            </div>
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
