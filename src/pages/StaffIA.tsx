import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, ArrowLeft, BarChart3, BookOpen, Sparkles, Brain, MessageSquare, LayoutDashboard, Zap, Code2, Search, Cpu, FlaskConical, Play } from "lucide-react";
import IADashboard from "@/components/staff/IADashboard";
import AiEngineGuide from "@/components/staff/AiEngineGuide";
import AiRoutesManagement from "@/components/staff/AiRoutesManagement";
import AiEngineTestMode from "@/components/staff/AiEngineTestMode";
import AiEngineTestBench from "@/components/staff/AiEngineTestBench";
import AIConfigManagement from "@/components/staff/AIConfigManagement";
import AiSuggestionsManagement from "@/components/staff/AiSuggestionsManagement";
import AiFollowupsManagement from "@/components/staff/AiFollowupsManagement";
import ClubFollowupPromptEditor from "@/components/staff/ClubFollowupPromptEditor";
import PopularSearchesManagement from "@/components/staff/PopularSearchesManagement";
import AiUsageManagement from "@/components/staff/AiUsageManagement";
import AiResolutionMetrics from "@/components/staff/AiResolutionMetrics";
import AiConversationPerf from "@/components/staff/AiConversationPerf";
import EmbedUsageManagement from "@/components/staff/EmbedUsageManagement";
import EmbedAiHowItWorks from "@/components/staff/EmbedAiHowItWorks";
import KnowledgeBaseManagement from "@/components/staff/KnowledgeBaseManagement";
import KBViewer from "@/components/staff/KBViewer";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";


const StaffIA = () => {
  const [user, setUser] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
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
              <p className="text-background/60 text-sm">IA</p>
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
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="engine" className="gap-2">
              <Cpu className="h-4 w-4" />
              Moteur IA
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="gap-2">
              <Sparkles className="h-4 w-4" />
              IA
            </TabsTrigger>

            <TabsTrigger value="club-ai-suggestions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Suggestions Chat IA du Club
            </TabsTrigger>
            <TabsTrigger value="embed-ai-suggestions" className="gap-2">
              <Code2 className="h-4 w-4" />
              Suggestions Embed IA
            </TabsTrigger>
            <TabsTrigger value="search-ai" className="gap-2">
              <Search className="h-4 w-4" />
              Search IA
            </TabsTrigger>
            <TabsTrigger value="ai-usage" className="gap-2">
              <Zap className="h-4 w-4" />
              Utilisation IA
            </TabsTrigger>

            <TabsTrigger value="ai-perf" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Perf IA
            </TabsTrigger>
            <TabsTrigger value="embed-usage" className="gap-2">
              <Code2 className="h-4 w-4" />
              Usage embed
            </TabsTrigger>
            <TabsTrigger value="kb" className="gap-2">
              <BookOpen className="h-4 w-4" />
              KB IA
            </TabsTrigger>
            <TabsTrigger value="ai-knowledge" className="gap-2">
              <Brain className="h-4 w-4" />
              Base IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <IADashboard onNavigateTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="engine">
            <Tabs defaultValue="guide">
              <TabsList className="mb-4">
                <TabsTrigger value="guide" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Fonctionnement
                </TabsTrigger>
                <TabsTrigger value="routes" className="gap-2">
                  <Cpu className="h-4 w-4" />
                  Routes
                </TabsTrigger>
              <TabsTrigger value="test" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                Mode test
              </TabsTrigger>
              <TabsTrigger value="test-bench" className="gap-2">
                <Play className="h-4 w-4" />
                Test bench
              </TabsTrigger>
              <TabsTrigger value="resolution" className="gap-2">
                <Cpu className="h-4 w-4" />
                Résolution
              </TabsTrigger>
            </TabsList>
            <TabsContent value="guide">
              <AiEngineGuide onNavigateTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="routes">
              <AiRoutesManagement />
            </TabsContent>
            <TabsContent value="test">
              <AiEngineTestMode />
            </TabsContent>
            <TabsContent value="test-bench">
              <AiEngineTestBench />
            </TabsContent>
            <TabsContent value="resolution">
              <AiResolutionMetrics />
            </TabsContent>
            </Tabs>
          </TabsContent>


          <TabsContent value="ai-config">
            <AIConfigManagement />
          </TabsContent>

          <TabsContent value="club-ai-suggestions">
            <Tabs defaultValue="search">
              <TabsList className="mb-4">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="club" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Suggestions Club
                </TabsTrigger>
                <TabsTrigger value="club-followups" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Relances Club
                </TabsTrigger>
                <TabsTrigger value="followups-prompt" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Prompt follow-ups
                </TabsTrigger>
              </TabsList>
              <TabsContent value="search">
                <PopularSearchesManagement />
              </TabsContent>
              <TabsContent value="club">
                <AiSuggestionsManagement surface="club" />
              </TabsContent>
              <TabsContent value="club-followups">
                <AiFollowupsManagement surface="club" />
              </TabsContent>
              <TabsContent value="followups-prompt">
                <ClubFollowupPromptEditor />
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="embed-ai-suggestions">
            <Tabs defaultValue="suggestions">
              <TabsList className="mb-4">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="followups" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Relances
                </TabsTrigger>
                <TabsTrigger value="how-it-works" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Fonctionnement
                </TabsTrigger>
              </TabsList>
              <TabsContent value="suggestions">
                <AiSuggestionsManagement surface="embed" />
              </TabsContent>
              <TabsContent value="followups">
                <AiFollowupsManagement surface="embed" />
              </TabsContent>
              <TabsContent value="how-it-works">
                <EmbedAiHowItWorks />
              </TabsContent>
            </Tabs>
          </TabsContent>



          <TabsContent value="search-ai">
            <Tabs defaultValue="suggestions">
              <TabsList className="mb-4">
                <TabsTrigger value="suggestions">Suggestions Search</TabsTrigger>
                <TabsTrigger value="followups" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Relances Search
                </TabsTrigger>
              </TabsList>
              <TabsContent value="suggestions">
                <AiSuggestionsManagement surface="search" />
              </TabsContent>
              <TabsContent value="followups">
                <AiFollowupsManagement surface="search" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="ai-usage">
            <AiUsageManagement />
          </TabsContent>

          <TabsContent value="ai-perf">
            <AiConversationPerf />
          </TabsContent>


          <TabsContent value="embed-usage">
            <EmbedUsageManagement />
          </TabsContent>

          <TabsContent value="kb">
            <KBViewer />
          </TabsContent>

          <TabsContent value="ai-knowledge">
            <KnowledgeBaseManagement
              categories={["general", "tourisme", "culture", "gastronomie"]}
              newEntryLabel="Nouvelle entrée IA"
              emptyLabel="Aucune entrée pour l'IA Concierge"
              showExternalUrls
            />
          </TabsContent>
        </Tabs>
      </main>

      <ScrollToTopButton />
    </div>
  );
};

export default StaffIA;
