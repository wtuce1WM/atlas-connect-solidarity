import React, { useState, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { HelpContentPanel } from "@/components/staff/ScrollToTopButton";
import DisplayPanel from "@/components/staff/DisplayPanel";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, Search, ArrowLeft, BarChart3, FlaskConical, BookOpen, Egg, Sparkles, Brain, LayoutDashboard, Monitor, ChevronRight, ShieldAlert, Hotel, DollarSign, FileText, Link as LinkIcon, MessageSquare, Database } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import SearchConfigManagement from "@/components/staff/SearchConfigManagement";
import UserManagement from "@/components/staff/UserManagement";
import SearchAnalytics from "@/pages/SearchAnalytics";
import TestSuitePanel from "@/components/staff/TestSuitePanel";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import KnowledgeBaseManagement from "@/components/staff/KnowledgeBaseManagement";
import ApiKnowledgeIndex from "@/components/staff/ApiKnowledgeIndex";
import EasterEggManagement from "@/components/staff/EasterEggManagement";
import MasterDashboard from "@/components/staff/MasterDashboard";
import PopularSearchesManagement from "@/components/staff/PopularSearchesManagement";
import BlockedDomainsManagement from "@/components/staff/BlockedDomainsManagement";
import BrokenLinksManagement from "@/components/staff/BrokenLinksManagement";
import HotelApiComparison from "@/components/staff/HotelApiComparison";
import PricingManagement from "@/components/staff/PricingManagement";
import BlogManagement from "@/components/staff/BlogManagement";
import VanityUrlsManagement from "@/components/staff/VanityUrlsManagement";


const StaffMaster = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

      <main className="w-full px-4 py-8">
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
            <TabsTrigger value="easter-eggs" className="gap-2">
              <Egg className="h-4 w-4" />
              Easter Eggs
            </TabsTrigger>
            <TabsTrigger value="blocked-domains" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Domaines bloqués
            </TabsTrigger>
            <TabsTrigger value="hotel-compare" className="gap-2">
              <Hotel className="h-4 w-4" />
              Hôtels API
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Prix
            </TabsTrigger>
            <TabsTrigger value="vanity-urls" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Alias URL
            </TabsTrigger>
            {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Gestion des utilisateurs
            </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard">
            <MasterDashboard onNavigateTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="search-config">
            <SearchConfigManagement />
          </TabsContent>


          <TabsContent value="analytics">
            <SearchAnalytics embedded />
          </TabsContent>

          <TabsContent value="tests">
            <TestSuitePanel />
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            <ApiKnowledgeIndex />
            <KnowledgeBaseManagement
              categories={["AI", "API", "search-engine", "voice-search", "opening-hours", "UI", "architecture", "business-rules", "bug-fix", "tech", "technique"]}
              newEntryLabel="Nouvelle note technique"
              emptyLabel="Aucune note technique"
            />
          </TabsContent>


          <TabsContent value="easter-eggs">
            <EasterEggManagement />
          </TabsContent>


          <TabsContent value="blocked-domains">
            <div className="space-y-6">
              <BlockedDomainsManagement />
              <BrokenLinksManagement />
            </div>
          </TabsContent>

          <TabsContent value="hotel-compare">
            <HotelApiComparison />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingManagement />
          </TabsContent>

          <TabsContent value="vanity-urls">
            <VanityUrlsManagement />
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
