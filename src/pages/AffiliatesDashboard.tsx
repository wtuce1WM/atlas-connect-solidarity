import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, LogOut, BarChart3, Link as LinkIcon, DollarSign } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BusinessAnalyticsPanel from "@/components/affiliate/BusinessAnalyticsPanel";
import logoGold from "@/assets/logoGOLDsimple.webp";


const AffiliatesDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const translations = {
    fr: {
      title: "Tableau de bord Affiliés",
      welcome: "Bienvenue",
      logout: "Déconnexion",
      stats: "Statistiques",
      links: "Mes liens",
      earnings: "Mes gains",
      comingSoon: "Fonctionnalité à venir",
      comingSoonDesc: "Cette section sera bientôt disponible avec de nouvelles fonctionnalités pour nos affiliés.",
      totalClicks: "Clics totaux",
      totalConversions: "Conversions",
      totalEarnings: "Gains totaux",
    },
    en: {
      title: "Affiliates Dashboard",
      welcome: "Welcome",
      logout: "Sign Out",
      stats: "Statistics",
      links: "My Links",
      earnings: "My Earnings",
      comingSoon: "Coming Soon",
      comingSoonDesc: "This section will soon be available with new features for our affiliates.",
      totalClicks: "Total Clicks",
      totalConversions: "Conversions",
      totalEarnings: "Total Earnings",
    },
    ar: {
      title: "لوحة تحكم الشركاء",
      welcome: "مرحبًا",
      logout: "تسجيل الخروج",
      stats: "الإحصائيات",
      links: "روابطي",
      earnings: "أرباحي",
      comingSoon: "قريبًا",
      comingSoonDesc: "سيكون هذا القسم متاحًا قريبًا بميزات جديدة لشركائنا.",
      totalClicks: "إجمالي النقرات",
      totalConversions: "التحويلات",
      totalEarnings: "إجمالي الأرباح",
    },
  };

  const t = translations[language] || translations.fr;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/affiliates");
        return;
      }
      setUserEmail(session.user.email);
      setIsLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/affiliates");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/affiliates");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-gold/20 p-3">
              <Users className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t.title}</h1>
              <p className="text-muted-foreground">{t.welcome}, {userEmail}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.logout}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalClicks}</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/20 p-3">
                  <LinkIcon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalConversions}</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gold/20 p-3">
                  <DollarSign className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.totalEarnings}</p>
                  <p className="text-2xl font-bold text-foreground">0 MAD</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics par établissement (temps réel) */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Analytics par établissement</CardTitle>
            <CardDescription className="text-muted-foreground">
              Données temps réel issues de votre fiche : vues, intentions de contact et conversions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessAnalyticsPanel />
          </CardContent>
        </Card>


        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate("/affiliates/presence")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/20 p-3">
                  <LinkIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Présence en ligne</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Gérez vos profils sociaux et plateformes d'avis
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={logoGold} alt="Logo" className="h-16 w-16 object-contain opacity-50" />
              </div>
              <CardTitle className="text-xl text-foreground">{t.comingSoon}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {t.comingSoonDesc}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliatesDashboard;
