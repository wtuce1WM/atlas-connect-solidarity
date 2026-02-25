import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Users, Shield } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";

const StaffHub = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/staff/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  const sections = [
    {
      title: "Catalogue",
      description: "Gérer les établissements, catégories, labels, sponsors et toute la donnée métier.",
      icon: BookOpen,
      href: "/staff/catalogue",
      color: "from-gold/20 to-amber-500/10",
      iconColor: "text-gold",
    },
    {
      title: "CRM",
      description: "Gestion de la relation client, affiliés et suivi commercial.",
      icon: Users,
      href: "#",
      color: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-600",
      disabled: true,
    },
    {
      title: "Master",
      description: "Administration avancée, configuration système et contrôle des accès.",
      icon: Shield,
      href: "#",
      color: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-600",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGold} alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">Backoffice</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-background/60 text-sm hidden md:block">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-black text-white border-black hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Hub content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Bienvenue dans le Backoffice</h1>
          <p className="text-muted-foreground">Sélectionnez un module pour commencer</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.title}
                onClick={() => !section.disabled && navigate(section.href)}
                disabled={section.disabled}
                className={`group relative bg-background rounded-2xl border p-8 text-left transition-all duration-300 ${
                  section.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer"
                }`}
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${section.color} mb-5`}>
                  <Icon className={`h-8 w-8 ${section.iconColor}`} />
                </div>
                <h2 className="text-xl font-bold mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>
                {section.disabled && (
                  <span className="absolute top-4 right-4 text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                    Bientôt
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default StaffHub;
