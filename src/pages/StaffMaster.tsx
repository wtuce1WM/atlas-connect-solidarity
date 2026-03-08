import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, Search, ArrowLeft, BarChart3, FlaskConical, BookOpen, Egg, Sparkles, Brain, LayoutDashboard, Monitor, ChevronRight } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import SearchConfigManagement from "@/components/staff/SearchConfigManagement";
import UserManagement from "@/components/staff/UserManagement";
import SearchAnalytics from "@/pages/SearchAnalytics";
import TestSuitePanel from "@/components/staff/TestSuitePanel";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import KnowledgeBaseManagement from "@/components/staff/KnowledgeBaseManagement";
import EasterEggManagement from "@/components/staff/EasterEggManagement";
import AIConfigManagement from "@/components/staff/AIConfigManagement";
import MasterDashboard from "@/components/staff/MasterDashboard";

const DisplayParam = ({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
    {preview && <div className="shrink-0 mt-0.5">{preview}</div>}
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-mono text-foreground break-all">{value}</p>
    </div>
  </div>
);

const StaffMaster = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
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
      const hasAdmin = roles.some((r) => r.role === "admin");
      setIsAdmin(hasAdmin);
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
    <div className="min-h-screen bg-muted">
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff/backoffice")} className="text-background/60 hover:text-background hover:bg-background/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoGold} alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">Master</p>
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

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="search-config" className="gap-2">
              <Search className="h-4 w-4" />
              Recherche
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="gap-2">
              <Sparkles className="h-4 w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Search Analytics
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Connaissances
            </TabsTrigger>
            <TabsTrigger value="ai-knowledge" className="gap-2">
              <Brain className="h-4 w-4" />
              Base IA
            </TabsTrigger>
            <TabsTrigger value="easter-eggs" className="gap-2">
              <Egg className="h-4 w-4" />
              Easter Eggs
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Monitor className="h-4 w-4" />
              Affichage
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <MasterDashboard onNavigateTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="search-config">
            <SearchConfigManagement />
          </TabsContent>

          <TabsContent value="ai-config">
            <AIConfigManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <SearchAnalytics embedded />
          </TabsContent>

          <TabsContent value="tests">
            <TestSuitePanel />
          </TabsContent>

          <TabsContent value="knowledge">
            <KnowledgeBaseManagement
              categories={["search-engine", "voice-search", "opening-hours", "UI", "architecture", "business-rules", "bug-fix", "tech"]}
              newEntryLabel="Nouvelle note technique"
              emptyLabel="Aucune note technique"
            />
          </TabsContent>

          <TabsContent value="ai-knowledge">
            <KnowledgeBaseManagement
              categories={["general", "tourisme", "culture", "gastronomie"]}
              newEntryLabel="Nouvelle entrée IA"
              emptyLabel="Aucune entrée pour l'IA Concierge"
              showExternalUrls
            />
          </TabsContent>

          <TabsContent value="easter-eggs">
            <EasterEggManagement />
          </TabsContent>

          <TabsContent value="display">
            <div className="space-y-6">
              <Collapsible>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                        <Monitor className="h-5 w-5" />
                        Header
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                  <div className="space-y-6">
                    {/* Structure */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Structure</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DisplayParam label="Balise HTML" value="<header>" />
                        <DisplayParam label="Position" value="fixed top-0 left-0 right-0" />
                        <DisplayParam label="Z-index" value="z-50" />
                        <DisplayParam label="Conteneur" value="container mx-auto" />
                        <DisplayParam label="Padding" value="px-4 py-3" />
                        <DisplayParam label="Layout" value="flex items-center justify-between gap-3" />
                      </div>
                    </div>

                    {/* Variants de fond */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Variants de fond</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DisplayParam label='variant="default"' value="bg-white" preview={<div className="w-8 h-8 rounded border bg-white" />} />
                        <DisplayParam label='variant="morocco"' value="bg-gradient-to-b from-morocco-red to-morocco-red/80 backdrop-blur-sm" preview={<div className="w-8 h-8 rounded border bg-gradient-to-b from-red-700 to-red-700/80" />} />
                        <DisplayParam label='variant="city"' value="bg-transparent" preview={<div className="w-8 h-8 rounded border bg-transparent" style={{ backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%)', backgroundSize: '8px 8px' }} />} />
                      </div>
                    </div>

                    {/* Logo */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Logo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DisplayParam label="Balise" value="<a> → <img> + <span>" />
                        <DisplayParam label="Image" value="logoGOLDsimpleSML.webp" />
                        <DisplayParam label="Taille image" value="h-9 w-9 object-contain" />
                        <DisplayParam label="Texte 1" value='"ONE WORLD"' preview={<span className="text-gold font-bold">ONE WORLD</span>} />
                        <DisplayParam label="Texte 2" value='"MOROCCO"' preview={<span className="text-black font-bold">MOROCCO</span>} />
                        <DisplayParam label="Police texte" value="text-lg font-bold tracking-tight" />
                        <DisplayParam label="Couleur texte 1" value="text-gold" preview={<div className="w-8 h-8 rounded border" style={{ backgroundColor: 'hsl(var(--gold))' }} />} />
                        <DisplayParam label="Couleur texte 2" value="text-black" preview={<div className="w-8 h-8 rounded border bg-black" />} />
                        <DisplayParam label="Responsive" value="hidden sm:inline (texte masqué mobile)" />
                      </div>
                    </div>

                    {/* Menu */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Menu</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DisplayParam label="Icône ouvert" value="<X> (lucide)" />
                        <DisplayParam label="Icône fermé" value="<Menu> (lucide)" />
                        <DisplayParam label="Taille icône" value="h-6 w-6" />
                        <DisplayParam label="Couleur icône" value="text-black" />
                        <DisplayParam label="Fond dropdown" value="bg-background border-t border-border" />
                        <DisplayParam label="Layout dropdown" value="flex-col items-center gap-4 px-4 py-6" />
                      </div>
                    </div>

                    {/* Navigation links */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Liens de navigation</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lien</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Route</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Clé i18n</th>
                              <th className="text-left py-2 font-medium text-muted-foreground">Style</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            <tr><td className="py-2 pr-4">Notre Mission</td><td className="py-2 pr-4 font-mono text-xs">/mission</td><td className="py-2 pr-4 font-mono text-xs">footer.ourMission</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                            <tr><td className="py-2 pr-4">Recherche</td><td className="py-2 pr-4 font-mono text-xs">/search</td><td className="py-2 pr-4 font-mono text-xs">—</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                            <tr><td className="py-2 pr-4">Hôtels</td><td className="py-2 pr-4 font-mono text-xs">/hotels</td><td className="py-2 pr-4 font-mono text-xs">—</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                            <tr><td className="py-2 pr-4">Contact</td><td className="py-2 pr-4 font-mono text-xs">/contact</td><td className="py-2 pr-4 font-mono text-xs">footer.contact</td><td className="py-2 text-xs">text-foreground hover:text-gold</td></tr>
                            <tr><td className="py-2 pr-4 font-semibold">Rejoignez-nous</td><td className="py-2 pr-4 font-mono text-xs">/devenir-affilie</td><td className="py-2 pr-4 font-mono text-xs">nav.joinNow</td><td className="py-2 text-xs">bg-gold text-gold-foreground rounded-lg px-4 py-2 font-semibold</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Comportement */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 border-b pb-2">Comportement</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DisplayParam label="Fermeture auto" value="Clic à l'extérieur (mousedown listener)" />
                        <DisplayParam label="Props" value='variant: "default" | "morocco" | "city"' />
                      </div>
                    </div>
                  </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffMaster;
