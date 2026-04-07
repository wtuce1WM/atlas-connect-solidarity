import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutGrid, Video, Search, Monitor, FileText, Settings2, Home, MonitorSmartphone, Tablet, Smartphone } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import FrontStructureManagement from "@/components/staff/FrontStructureManagement";
import DestinationVideosPanel from "@/components/staff/DestinationVideosPanel";
import HomepageBusinessesPanel from "@/components/staff/HomepageBusinessesPanel";
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
            <TabsTrigger value="homepage" className="gap-2">
              <Home className="h-4 w-4" />
              Homepage
            </TabsTrigger>
            <TabsTrigger value="preview-desktop" className="gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="preview-tablet" className="gap-2">
              <Tablet className="h-4 w-4" />
              Tablette
            </TabsTrigger>
            <TabsTrigger value="preview-mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
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
            <TabsTrigger value="social-links" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Réseaux sociaux
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

          <TabsContent value="homepage">
            <Tabs defaultValue="marrakech">
              <TabsList className="mb-4">
                <TabsTrigger value="marrakech">Marrakech</TabsTrigger>
                <TabsTrigger value="essaouira">Essaouira</TabsTrigger>
              </TabsList>
              <TabsContent value="marrakech">
                <HomepageBusinessesPanel cityName="Marrakech" />
              </TabsContent>
              <TabsContent value="essaouira">
                <HomepageBusinessesPanel cityName="Essaouira" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="preview-desktop">
            <div className="flex justify-center gap-8 items-start">
              <div className="border rounded-lg overflow-hidden shadow-sm" style={{ width: 1920, maxWidth: "calc(100% - 380px)" }}>
                <iframe src="/" className="w-full border-0" style={{ height: "80vh" }} title="Aperçu Desktop (1920×1080)" />
              </div>
              <div className="border rounded-lg bg-background p-5 shadow-sm text-sm" style={{ minWidth: 340 }}>
                <h3 className="font-bold text-foreground mb-3">Résolutions desktop courantes</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 font-semibold text-foreground">Résolution CSS</th>
                      <th className="py-2 font-semibold text-foreground text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2">1920×1080 (Full HD)</td><td className="py-2 text-right">~22%</td></tr>
                    <tr className="border-b"><td className="py-2">1536×864 (HD+)</td><td className="py-2 text-right">~10%</td></tr>
                    <tr className="border-b"><td className="py-2">1440×900 (WXGA+)</td><td className="py-2 text-right">~7%</td></tr>
                    <tr className="border-b"><td className="py-2">1366×768 (HD)</td><td className="py-2 text-right">~6%</td></tr>
                    <tr><td className="py-2">2560×1440 (QHD)</td><td className="py-2 text-right">~5%</td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">Breakpoints Tailwind : <code className="bg-muted px-1 rounded">lg</code> : 1024px · <code className="bg-muted px-1 rounded">xl</code> : 1280px · <code className="bg-muted px-1 rounded">2xl</code> : 1536px</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview-tablet">
            <div className="flex justify-center gap-8 items-start">
              <div className="border rounded-lg overflow-hidden shadow-sm" style={{ width: 768 }}>
                <iframe src="/" className="w-full border-0" style={{ height: "80vh" }} title="Aperçu Tablette (768×1024)" />
              </div>
              <div className="border rounded-lg bg-background p-5 shadow-sm text-sm" style={{ minWidth: 340 }}>
                <h3 className="font-bold text-foreground mb-3">Résolutions tablette courantes</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 font-semibold text-foreground">Résolution CSS</th>
                      <th className="py-2 font-semibold text-foreground text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2">768×1024 (iPad classique)</td><td className="py-2 text-right">~30%</td></tr>
                    <tr className="border-b"><td className="py-2">810×1080 (iPad 10e gen)</td><td className="py-2 text-right">~15%</td></tr>
                    <tr className="border-b"><td className="py-2">820×1180 (iPad Air)</td><td className="py-2 text-right">~12%</td></tr>
                    <tr className="border-b"><td className="py-2">1024×1366 (iPad Pro 12.9)</td><td className="py-2 text-right">~10%</td></tr>
                    <tr><td className="py-2">800×1280 (Android tablet)</td><td className="py-2 text-right">~8%</td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">Breakpoint Tailwind : <code className="bg-muted px-1 rounded">md</code> : 768px</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview-mobile">
            <div className="flex justify-center gap-8 items-start">
              <div className="border rounded-lg overflow-hidden shadow-sm" style={{ width: 390 }}>
                <iframe src="/" className="w-full border-0" style={{ height: "80vh" }} title="Aperçu Mobile (390×844)" />
              </div>
              <div className="border rounded-lg bg-background p-5 shadow-sm text-sm" style={{ minWidth: 340 }}>
                <h3 className="font-bold text-foreground mb-3">Résolutions mobiles courantes</h3>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 font-semibold text-foreground">Résolution CSS</th>
                      <th className="py-2 font-semibold text-foreground text-right">Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b"><td className="py-2">390×844 (iPhone 14/15)</td><td className="py-2 text-right">~25%</td></tr>
                    <tr className="border-b"><td className="py-2">393×873 (iPhone 15 Pro)</td><td className="py-2 text-right">~15%</td></tr>
                    <tr className="border-b"><td className="py-2">360×800 (Android standard)</td><td className="py-2 text-right">~20%</td></tr>
                    <tr className="border-b"><td className="py-2">412×915 (Samsung Galaxy)</td><td className="py-2 text-right">~12%</td></tr>
                    <tr><td className="py-2">375×812 (iPhone X/11 Pro)</td><td className="py-2 text-right">~10%</td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">Breakpoint Tailwind : <code className="bg-muted px-1 rounded">sm</code> : 640px</p>
              </div>
            </div>
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

          <TabsContent value="social-links">
            <SocialLinksManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StaffFront;
