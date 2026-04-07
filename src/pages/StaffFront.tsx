import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutGrid, Video, Search, Monitor, FileText, Settings2 } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import FrontStructureManagement from "@/components/staff/FrontStructureManagement";
import DestinationVideosPanel from "@/components/staff/DestinationVideosPanel";
import PopularSearchesManagement from "@/components/staff/PopularSearchesManagement";
import DisplayPanel from "@/components/staff/DisplayPanel";
import BlogManagement from "@/components/staff/BlogManagement";
import SocialLinksManagement from "@/components/staff/SocialLinksManagement";


const StaffFront = () => {
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGold} alt="Logo" className="h-10 w-10 object-contain" />
            <span className="font-serif text-lg font-bold text-background">Présentation</span>
          </div>
          <Button variant="ghost" size="sm" className="text-background hover:text-gold" onClick={() => navigate("/staff/backoffice")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <Tabs defaultValue="front-structure">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="front-structure" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Structure du front
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="h-4 w-4" />
              Vidéos
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Search className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Monitor className="h-4 w-4" />
              Affichage
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="h-4 w-4" />
              Ressources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="front-structure">
            <FrontStructureManagement open={true} onOpenChange={() => {}} inline />
          </TabsContent>

          <TabsContent value="videos">
            <Tabs defaultValue="marrakech">
              <TabsList className="mb-4">
                <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
              </TabsList>
              <TabsContent value="marrakech">
                <DestinationVideosPanel cityName="Marrakech" />
              </TabsContent>
              <TabsContent value="essaouira">
                <DestinationVideosPanel cityName="Essaouira" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="suggestions">
            <PopularSearchesManagement />
          </TabsContent>

          <TabsContent value="display">
            <DisplayPanel />
          </TabsContent>

          <TabsContent value="resources">
            <BlogManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StaffFront;
