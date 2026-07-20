import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, LogOut, Link as LinkIcon } from "lucide-react";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import BusinessAnalyticsPanel from "@/components/affiliate/BusinessAnalyticsPanel";
import AffiliateAggregateStats from "@/components/affiliate/AffiliateAggregateStats";
import { trackEvent } from "@/lib/analytics";


const AffiliatesDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasDashboard, setHasDashboard] = useState(false);
  const [hasVideoStudio, setHasVideoStudio] = useState(false);

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

  const trackedViewRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/affiliates");
        return;
      }
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, has_dashboard, has_video_studio")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!affiliate) {
        await supabase.auth.signOut();
        navigate("/affiliates");
        return;
      }

      setHasDashboard(!!(affiliate as any).has_dashboard);
      setHasVideoStudio(!!(affiliate as any).has_video_studio);


      setUserEmail(session.user.email);
      setIsLoading(false);
      if (!trackedViewRef.current) {
        trackedViewRef.current = true;
        trackEvent("affiliate_dashboard_view", { user_id: session.user.id });
      }
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
    trackEvent("affiliate_logout_click", {});
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
      <HomeMindtripHeader
        alwaysWhite
        customLinks={[
          { label: "Présence en ligne", to: "/affiliates/presence" },
          ...(hasDashboard ? [{ label: "Tableau de bord", to: "/affiliates/dashboard" }] : []),
          ...(hasVideoStudio ? [{ label: "Studio vidéo", to: "/studio-video" }] : []),
          { label: "Nouvel établissement", to: "/affiliates/presence?new=1" },
          { label: "Se déconnecter", onClick: handleLogout, danger: true },
        ]}
      />
      
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

        {/* Aggregated stats + businesses list */}
        <AffiliateAggregateStats />

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
          <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { trackEvent("affiliate_presence_click", {}); navigate("/affiliates/presence"); }}>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliatesDashboard;
