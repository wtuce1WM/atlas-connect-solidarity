import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, BookOpen, Egg, Star, UserCheck, BarChart3, FlaskConical, Sparkles, Brain,
  AlertTriangle, CheckCircle2, XCircle, Loader2, ArrowRight, FileText,
} from "lucide-react";
import BatchThumbnailGenerator from "./BatchThumbnailGenerator";
import { supabase } from "@/integrations/supabase/client";

interface MasterDashboardProps {
  onNavigateTab: (tab: string) => void;
}

interface ConfigHealth {
  synonymsTotal: number;
  synonymsActive: number;
  synonymsInactive: number;
  synonymsNoSubcats: number;
  bundlesTotal: number;
  bundlesActive: number;
  bundlesInactive: number;
  intentionsTotal: number;
  intentionsActive: number;
  easterEggsTotal: number;
  easterEggsActive: number;
  aiConfigCount: number;
  knowledgeCount: number;
  aiKnowledgeCount: number;
  sponsorsActive: number;
  affiliatesActive: number;
  blogTotal: number;
  blogPublished: number;
}

const MasterDashboard = ({ onNavigateTab }: MasterDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<ConfigHealth | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [
        synRes, bundleRes, intentRes, eggRes, aiRes,
        knowRes, aiKnowRes, sponsorRes, affRes, blogRes,
      ] = await Promise.all([
        supabase.from("search_synonyms").select("id, is_active, subcategory_names"),
        supabase.from("search_bundles").select("id, is_active"),
        supabase.from("subcategory_search_config").select("id, search_mode"),
        supabase.from("easter_eggs").select("id, is_active"),
        supabase.from("ai_config").select("id"),
        supabase.from("knowledge_entries").select("id, category").in("category", ["search-engine", "voice-search", "opening-hours", "UI", "architecture", "business-rules", "bug-fix", "tech"]),
        supabase.from("knowledge_entries").select("id, category").in("category", ["general", "tourisme", "culture", "gastronomie"]),
        supabase.from("sponsors").select("id, is_active"),
        supabase.from("affiliates").select("id, is_active"),
        supabase.from("blog_posts").select("id, is_published"),
      ]);

      const synonyms = synRes.data || [];
      const bundles = bundleRes.data || [];
      const eggs = eggRes.data || [];
      const sponsors = sponsorRes.data || [];
      const affiliates = affRes.data || [];
      const blogPosts = blogRes.data || [];

      setHealth({
        synonymsTotal: synonyms.length,
        synonymsActive: synonyms.filter((s: any) => s.is_active).length,
        synonymsInactive: synonyms.filter((s: any) => !s.is_active).length,
        synonymsNoSubcats: synonyms.filter((s: any) => s.is_active && (!s.subcategory_names || s.subcategory_names.length === 0)).length,
        bundlesTotal: bundles.length,
        bundlesActive: bundles.filter((b: any) => b.is_active).length,
        bundlesInactive: bundles.filter((b: any) => !b.is_active).length,
        intentionsTotal: intentRes.data?.length || 0,
        intentionsActive: intentRes.data?.length || 0,
        easterEggsTotal: eggs.length,
        easterEggsActive: eggs.filter((e: any) => e.is_active).length,
        aiConfigCount: aiRes.data?.length || 0,
        knowledgeCount: knowRes.data?.length || 0,
        aiKnowledgeCount: aiKnowRes.data?.length || 0,
        sponsorsActive: sponsors.filter((s: any) => s.is_active).length,
        affiliatesActive: affiliates.filter((a: any) => a.is_active).length,
        blogTotal: blogPosts.length,
        blogPublished: blogPosts.filter((b: any) => b.is_published).length,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!health) return null;

  const alerts: { message: string; tab: string; severity: "warning" | "info" }[] = [];

  if (health.synonymsInactive > 0) {
    alerts.push({ message: `${health.synonymsInactive} synonyme(s) désactivé(s)`, tab: "search-config", severity: "info" });
  }
  if (health.synonymsNoSubcats > 0) {
    alerts.push({ message: `${health.synonymsNoSubcats} synonyme(s) actif(s) sans sous-catégorie associée`, tab: "search-config", severity: "warning" });
  }
  if (health.bundlesInactive > 0) {
    alerts.push({ message: `${health.bundlesInactive} bundle(s) désactivé(s)`, tab: "search-config", severity: "info" });
  }


  const shortcuts: { label: string; tab?: string; href?: string; icon: any; count: string | null }[] = [
    { label: "Recherche", tab: "search-config", icon: Search, count: `${health.synonymsActive} syn · ${health.bundlesActive} bundles` },
    { label: "IA", href: "/staff/ia?tab=ai-config", icon: Sparkles, count: `${health.aiConfigCount} clés` },
    { label: "Articles Blog", tab: "blog", icon: FileText, count: `${health.blogPublished}/${health.blogTotal} publiés` },
    { label: "Affiliés", tab: "affiliates", icon: UserCheck, count: `${health.affiliatesActive} actifs` },
    { label: "Sponsors", tab: "sponsors", icon: Star, count: `${health.sponsorsActive} actifs` },
    { label: "Search Analytics", tab: "analytics", icon: BarChart3, count: null },
    { label: "Tests", tab: "tests", icon: FlaskConical, count: null },
    { label: "Connaissances", tab: "knowledge", icon: BookOpen, count: `${health.knowledgeCount} notes` },
    { label: "Base IA", href: "/staff/ia?tab=ai-knowledge", icon: Brain, count: `${health.aiKnowledgeCount} entrées` },
    { label: "Easter Eggs", tab: "easter-eggs", icon: Egg, count: `${health.easterEggsActive}/${health.easterEggsTotal} actifs` },
  ];

  return (
    <div className="space-y-6">
      {/* Config health alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Santé de la configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={() => onNavigateTab(alert.tab)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                {alert.severity === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm flex-1">{alert.message}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
            {alerts.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Tout est en ordre
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("search-config")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{health.synonymsActive}</div>
            <p className="text-sm text-muted-foreground">Synonymes actifs</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("search-config")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{health.bundlesActive}</div>
            <p className="text-sm text-muted-foreground">Bundles actifs</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("sponsors")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{health.sponsorsActive}</div>
            <p className="text-sm text-muted-foreground">Sponsors actifs</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => onNavigateTab("affiliates")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{health.affiliatesActive}</div>
            <p className="text-sm text-muted-foreground">Affiliés actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {shortcuts.map((s) => (
              <button
                key={s.tab || s.href}
                onClick={() => s.href ? navigate(s.href) : s.tab && onNavigateTab(s.tab)}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
              >
                <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.label}</div>
                  {s.count && (
                    <div className="text-xs text-muted-foreground">{s.count}</div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <BatchThumbnailGenerator />
    </div>
  );
};

export default MasterDashboard;
