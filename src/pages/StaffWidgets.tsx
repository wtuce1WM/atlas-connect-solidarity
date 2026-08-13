import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Blocks, SlidersHorizontal, Building2, ShieldCheck, BarChart3, ExternalLink } from "lucide-react";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import WidgetSettingsPanel from "@/components/staff/widgets/WidgetSettingsPanel";
import WidgetOverridesPanel from "@/components/staff/widgets/WidgetOverridesPanel";
import WidgetAuditPanel from "@/components/staff/widgets/WidgetAuditPanel";
import WidgetAnalyticsPanel from "@/components/staff/widgets/WidgetAnalyticsPanel";

const StaffWidgets = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/staff/backoffice")}
              className="text-background/60 hover:text-background hover:bg-background/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/logo-gold.webp" alt="One World Morocco" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-background font-semibold flex items-center gap-2">
                <Blocks className="h-4 w-4 text-sky-400" /> Widgets
              </h1>
              <p className="text-background/50 text-xs">Paramètres d'affichage, surcharges, audit et mesures d'usage</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("/widgets", "_blank")}
              className="text-background/60 hover:text-background hover:bg-background/10"
            >
              <ExternalLink className="h-4 w-4 mr-2" /> Vitrine
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/staff/login");
              }}
              className="text-background/60 hover:text-background hover:bg-background/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="settings">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="settings" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Réglages
            </TabsTrigger>
            <TabsTrigger value="overrides" className="gap-2">
              <Building2 className="h-4 w-4" /> Établissements
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Audit d'usage
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <WidgetSettingsPanel />
          </TabsContent>
          <TabsContent value="overrides">
            <WidgetOverridesPanel />
          </TabsContent>
          <TabsContent value="audit">
            <WidgetAuditPanel />
          </TabsContent>
          <TabsContent value="analytics">
            <WidgetAnalyticsPanel />
          </TabsContent>
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffWidgets;
