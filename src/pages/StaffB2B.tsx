import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft, UserCheck, Star, BarChart3, ShieldCheck, ReceiptText } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import AffiliateManagement from "@/components/staff/AffiliateManagement";
import AffiliateRightsPanel from "@/components/staff/AffiliateRightsPanel";
import SponsorManagement from "@/components/staff/SponsorManagement";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import BusinessAnalyticsPanel from "@/components/affiliate/BusinessAnalyticsPanel";
import BillingManagement from "@/components/staff/billing/BillingManagement";



const StaffB2B = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("affiliates");
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/staff/login");
    });
    return () => subscription.unsubscribe();
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

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff/backoffice")} className="text-background/60 hover:text-background hover:bg-background/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/logo-gold.webp" alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">B2B</p>
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

      <main className="w-full px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="affiliates" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Affiliés
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-2">
              <Star className="h-4 w-4" />
              Sponsors
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <ReceiptText className="h-4 w-4" />
              Devis &amp; Factures
            </TabsTrigger>
          </TabsList>


          <TabsContent value="affiliates">
            <Tabs defaultValue="management">
              <TabsList className="mb-4">
                <TabsTrigger value="management" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Gestion des Affiliés
                </TabsTrigger>
                <TabsTrigger value="rights" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Droits
                </TabsTrigger>
              </TabsList>
              <TabsContent value="management">
                <AffiliateManagement />
              </TabsContent>
              <TabsContent value="rights">
                <AffiliateRightsPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="sponsors">
            <SponsorManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <BusinessAnalyticsPanel staffAllBusinesses />
          </TabsContent>

        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffB2B;
