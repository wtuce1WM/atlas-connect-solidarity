import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LayoutGrid, Video, Search, Monitor, FileText, Settings2, Home, MonitorSmartphone, Tablet, Smartphone } from "lucide-react";
import { ArrowLeft, LayoutGrid, Video, Search, Monitor, FileText, Settings2, Home, MonitorSmartphone, Tablet, Smartphone } from "lucide-react";

const PREVIEW_PAGES = [
  { value: "/", label: "Accueil" },
  { value: "/search", label: "Recherche" },
  { value: "/category/restaurants", label: "Catégorie (ex: Restaurants)" },
  { value: "/blog", label: "Blog" },
  { value: "/hotels", label: "Hôtels" },
  { value: "/club", label: "Club" },
  { value: "/mission", label: "Mission" },
  { value: "/contact", label: "Contact" },
  { value: "/carte", label: "Carte" },
  { value: "/conditions-generales", label: "CGF" },
];

const DESKTOP_RESOLUTIONS = [
  { res: "1920×1080 (Full HD)", ratio: "~22%" },
  { res: "1536×864 (HD+)", ratio: "~10%" },
  { res: "1440×900 (WXGA+)", ratio: "~7%" },
  { res: "1366×768 (HD)", ratio: "~6%" },
  { res: "2560×1440 (QHD)", ratio: "~5%" },
];
const TABLET_RESOLUTIONS = [
  { res: "768×1024 (iPad classique)", ratio: "~30%" },
  { res: "810×1080 (iPad 10e gen)", ratio: "~15%" },
  { res: "820×1180 (iPad Air)", ratio: "~12%" },
  { res: "1024×1366 (iPad Pro 12.9)", ratio: "~10%" },
  { res: "800×1280 (Android tablet)", ratio: "~8%" },
];
const MOBILE_RESOLUTIONS = [
  { res: "390×844 (iPhone 14/15)", ratio: "~25%" },
  { res: "393×873 (iPhone 15 Pro)", ratio: "~15%" },
  { res: "360×800 (Android standard)", ratio: "~20%" },
  { res: "412×915 (Samsung Galaxy)", ratio: "~12%" },
  { res: "375×812 (iPhone X/11 Pro)", ratio: "~10%" },
];

const PreviewTab = ({ width, maxWidth, title, resolutions, breakpoints }: {
  width: number; maxWidth?: string; title: string;
  resolutions: { res: string; ratio: string }[]; breakpoints: string;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-8 items-start">
        <div className="border rounded-lg overflow-hidden shadow-sm" style={{ width, maxWidth: maxWidth || "100%" }}>
          <iframe src="/" className="w-full border-0" style={{ height: "80vh" }} title={`Aperçu ${title}`} />
        </div>
        <div className="border rounded-lg bg-background p-5 shadow-sm text-sm" style={{ minWidth: 340 }}>
          <h3 className="font-bold text-foreground mb-3">Résolutions {title.toLowerCase()} courantes</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2 font-semibold text-foreground">Résolution CSS</th>
                <th className="py-2 font-semibold text-foreground text-right">Ratio</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {resolutions.map((r, i) => (
                <tr key={i} className={i < resolutions.length - 1 ? "border-b" : ""}>
                  <td className="py-2">{r.res}</td>
                  <td className="py-2 text-right">{r.ratio}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Breakpoints Tailwind : {breakpoints.split(" · ").map((bp, i) => (
              <span key={i}>{i > 0 && " · "}<code className="bg-muted px-1 rounded">{bp}</code></span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
};

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
            <PreviewTab width={1920} maxWidth="calc(100% - 380px)" title="Desktop" resolutions={DESKTOP_RESOLUTIONS} breakpoints="lg : 1024px · xl : 1280px · 2xl : 1536px" />
          </TabsContent>

          <TabsContent value="preview-tablet">
            <PreviewTab width={768} title="Tablette" resolutions={TABLET_RESOLUTIONS} breakpoints="md : 768px" />
          </TabsContent>

          <TabsContent value="preview-mobile">
            <PreviewTab width={390} title="Mobile" resolutions={MOBILE_RESOLUTIONS} breakpoints="sm : 640px" />
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
