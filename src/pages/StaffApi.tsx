import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Hotel, DollarSign, Plug } from "lucide-react";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import HotelApiComparison from "@/components/staff/HotelApiComparison";
import PricingManagement from "@/components/staff/PricingManagement";

const StaffApi = () => {
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
                <Plug className="h-4 w-4 text-indigo-400" /> API
              </h1>
              <p className="text-background/50 text-xs">Comparaison des API hôtels et gestion des prix</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-background/60 text-sm hidden md:block">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/staff/login");
              }}
              className="bg-black text-white border-black hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-8">
        <Tabs defaultValue="hotel-compare">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="hotel-compare" className="gap-2">
              <Hotel className="h-4 w-4" />
              Hôtels API
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Prix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hotel-compare">
            <HotelApiComparison />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingManagement />
          </TabsContent>
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffApi;
