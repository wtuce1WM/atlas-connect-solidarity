import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, ListOrdered, LayoutDashboard, Film, Rocket, Clapperboard } from "lucide-react";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import VideoScenarioConfigPanel from "@/components/staff/VideoScenarioConfigPanel";
import VideoDashboardPanel from "@/components/staff/VideoDashboardPanel";
import LatestVideosPanel from "@/components/staff/LatestVideosPanel";
import VideoGeneratePanel from "@/components/staff/VideoGeneratePanel";
import VideoStoryboardPanel from "@/components/staff/VideoStoryboardPanel";





const StaffVideos = () => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login");
  };

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff/backoffice")} className="text-background/60 hover:text-background hover:bg-background/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/logo-gold.webp" alt="One World Morocco" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">Vidéos</p>
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
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="scenario" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Scénario
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="gap-2">
              <Clapperboard className="h-4 w-4" />
              Storyboard
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Rocket className="h-4 w-4" />
              Générer
            </TabsTrigger>
            <TabsTrigger value="latest" className="gap-2">
              <Film className="h-4 w-4" />
              Dernières vidéos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <VideoDashboardPanel />
          </TabsContent>
          <TabsContent value="scenario">
            <VideoScenarioConfigPanel />
          </TabsContent>
          <TabsContent value="storyboard">
            <VideoStoryboardPanel />
          </TabsContent>
          <TabsContent value="generate">
            <VideoGeneratePanel />
          </TabsContent>
          <TabsContent value="latest">
            <LatestVideosPanel />
          </TabsContent>
        </Tabs>




      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffVideos;
