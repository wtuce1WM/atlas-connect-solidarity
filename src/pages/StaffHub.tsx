import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Users, Shield, Star, Sparkles, Briefcase, Building2, BadgeCheck, MapPin, LayoutGrid, Save, StickyNote, Presentation, Newspaper, Blocks, Stethoscope, Clapperboard } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import RichTextEditor from "@/components/staff/RichTextEditor";
import { toast } from "sonner";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";

interface CityCount { city: string; count: number }
interface CatCount { main_category: string; count: number }

const StaffHub = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ active: 0, verified: 0 });
  const [cityStats, setCityStats] = useState<CityCount[]>([]);
  const [catStats, setCatStats] = useState<CatCount[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setIsAdmin(roles.some((r) => r.role === "admin"));
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Global stats
      const [activeRes, verifiedRes] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("is_active", true).eq("wtuce_status", "verified"),
      ]);
      setStats({ active: activeRes.count ?? 0, verified: verifiedRes.count ?? 0 });

      // City stats
      const { data: cityData } = await supabase
        .from("businesses")
        .select("city")
        .eq("is_active", true)
        .not("city", "is", null);
      if (cityData) {
        const counts: Record<string, number> = {};
        cityData.forEach((b: any) => { counts[b.city] = (counts[b.city] || 0) + 1; });
        const sorted = Object.entries(counts)
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count);
        setCityStats(sorted);
      }

      // Category stats
      const { data: catData } = await supabase
        .from("businesses")
        .select("main_category")
        .eq("is_active", true)
        .not("main_category", "is", null);
      if (catData) {
        const counts: Record<string, number> = {};
        catData.forEach((b: any) => { counts[b.main_category] = (counts[b.main_category] || 0) + 1; });
        const sorted = Object.entries(counts)
          .map(([main_category, count]) => ({ main_category, count }))
          .sort((a, b) => b.count - a.count);
        setCatStats(sorted);
      }

      // Load personal note
      const { data: noteData } = await supabase
        .from("staff_user_notes" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (noteData) {
        setNoteId((noteData as any).id);
        setNoteContent((noteData as any).content || "");
      }
      setNoteLoaded(true);
    };
    fetchAll();
  }, [user]);

  const saveNote = useCallback(async (content: string) => {
    if (!user) return;
    setNoteSaving(true);
    try {
      if (noteId) {
        await supabase.from("staff_user_notes" as any).update({ content, updated_at: new Date().toISOString() } as any).eq("id", noteId);
      } else {
        const { data } = await supabase.from("staff_user_notes" as any).insert({ user_id: user.id, content } as any).select().single();
        if (data) setNoteId((data as any).id);
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setNoteSaving(false);
    }
  }, [user, noteId]);

  const handleNoteChange = useCallback((val: string) => {
    setNoteContent(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveNote(val), 1500);
  }, [saveNote]);

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

  const allSections = [
    {
      title: "Catalogue",
      description: "Gérer les établissements, catégories, labels, sponsors et toute la donnée métier.",
      icon: BookOpen,
      href: "/staff/catalogue",
      color: "from-gold/20 to-amber-500/10",
      iconColor: "text-gold",
      adminOnly: true,
    },
    {
      title: "Présentation",
      description: "Configurer la présentation front : structure, sections, destinations et points d'intérêt.",
      icon: Presentation,
      href: "/staff/front",
      color: "from-teal-500/20 to-cyan-500/10",
      iconColor: "text-teal-600",
      adminOnly: true,
    },
    {
      title: "CRM",
      description: "Gestion de la relation client, affiliés et suivi commercial.",
      icon: Users,
      href: "/staff/crm",
      color: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-600",
      adminOnly: false,
    },
    {
      title: "B2B",
      description: "Gestion des affiliés, sponsors et partenariats commerciaux.",
      icon: Briefcase,
      href: "/staff/b2b",
      color: "from-emerald-500/20 to-green-500/10",
      iconColor: "text-emerald-600",
      adminOnly: false,
    },
    {
      title: "Master",
      description: "Administration avancée, configuration système et contrôle des accès.",
      icon: Shield,
      href: "/staff/master",
      color: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-600",
      adminOnly: true,
    },
    {
      title: "IA",
      description: "Configuration IA, suggestions Chat, usage, perf et base de connaissances.",
      icon: Sparkles,
      href: "/staff/ia",
      color: "from-amber-500/20 to-yellow-500/10",
      iconColor: "text-amber-600",
      adminOnly: true,
    },
    {
      title: "Blog",
      description: "Gestion des articles de blog éditoriaux et des rankings curés.",
      icon: Newspaper,
      href: "/staff/blog",
      color: "from-rose-500/20 to-orange-500/10",
      iconColor: "text-rose-600",
      adminOnly: true,
    },
    {

      title: "Widgets",
      description: "Backoffice des widgets embarquables : couleurs de fond, dimensions, surcharges par établissement, audit et analytics.",
      icon: Blocks,
      href: "/staff/backoffice/widgets",
      color: "from-sky-500/20 to-indigo-500/10",
      iconColor: "text-sky-600",
      adminOnly: true,
    },
    {
      title: "Diagnostic preview",
      description: "Contrôle technique : contexte iframe, edge functions, lectures base, perf et erreurs runtime.",
      icon: Stethoscope,
      href: "/staff/backoffice/diagnostic",
      color: "from-slate-500/20 to-zinc-500/10",
      iconColor: "text-slate-600",
      adminOnly: true,
    },
    {
      title: "Vidéos",
      description: "Configuration du Studio Vidéo IA : ordre et durée des étapes du scénario (établissement / corporate).",
      icon: Clapperboard,
      href: "/staff/backoffice/videos",
      color: "from-fuchsia-500/20 to-rose-500/10",
      iconColor: "text-fuchsia-600",
      adminOnly: true,
    },
  ];


  const sections = allSections.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-gold.webp" alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span>{" "}
                <span className="text-background">MOROCCO</span>
              </span>
              <p className="text-background/60 text-sm">Backoffice</p>
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

      {/* Hub content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">Bienvenue dans le Backoffice</h1>
          <ul className="text-muted-foreground text-sm space-y-1 mt-3">
            <li>1 — Votre communication en ligne centralisée</li>
            <li>2 — Pas de commission, la totalité des transactions restent dans l'économie nationale</li>
            <li>3 — Un modèle économique vertueux (20% de commission à des associations)</li>
            <li>4 — La précision de la recherche Google</li>
            <li>5 — Une présentation Premium</li>
            <li>6 — La personnalisation de l'IA</li>
          </ul>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-10">
          <div className="bg-background rounded-xl border p-5 text-center">
            <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/10 mb-3">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{stats.active}</p>
            <p className="text-xs text-muted-foreground mt-1">Entreprises actives</p>
          </div>
          <div className="bg-background rounded-xl border p-5 text-center">
            <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-emerald-500/15 to-green-500/10 mb-3">
              <BadgeCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold">{stats.verified}</p>
            <p className="text-xs text-muted-foreground mt-1">Entreprises vérifiées</p>
          </div>
        </div>

        {/* Stats by City & Category */}
        {!isAdmin && <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <div className="bg-background rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Par ville</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cityStats.map((c) => (
                <div key={c.city} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.city}</span>
                  <span className="font-mono font-semibold text-muted-foreground ml-2">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-background rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Par catégorie</h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {catStats.map((c) => (
                <div key={c.main_category} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.main_category}</span>
                  <span className="font-mono font-semibold text-muted-foreground ml-2">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* Modules */}
        <div className={`grid gap-6 max-w-5xl mx-auto ${sections.length === 4 ? 'md:grid-cols-4' : sections.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} mb-10`}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.title}
                onClick={() => navigate(section.href)}
                className="group relative bg-background rounded-2xl border p-8 text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer"
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${section.color} mb-5`}>
                  <Icon className={`h-8 w-8 ${section.iconColor}`} />
                </div>
                <h2 className="text-xl font-bold mb-2">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>
              </button>
            );
          })}
        </div>

        {/* Personal Note */}
        {!isAdmin && <div className="max-w-4xl mx-auto mb-10">
          <div className="bg-background rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-gold" />
                <h3 className="font-semibold text-sm">Ma note personnelle</h3>
              </div>
              {noteSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Save className="h-3 w-3 animate-pulse" /> Sauvegarde...
                </span>
              )}
              {!noteSaving && noteLoaded && noteId && (
                <span className="text-xs text-muted-foreground">✓ Sauvegardé</span>
              )}
            </div>
            {noteLoaded && (
              <RichTextEditor
                content={noteContent}
                onChange={handleNoteChange}
              />
            )}
          </div>
        </div>}

        {/* Fréquentation */}
        <FrequentationPanel />

        {/* Quick access */}

        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">Accès rapide</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/staff/master?tab=blog")}
              className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-gold/40 cursor-pointer"
            >
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-gold/20 to-amber-500/10">
                <BookOpen className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Articles de Blog</h3>
                <p className="text-xs text-muted-foreground">Consulter et gérer les articles publiés</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/blog/etablissements-notes")}
              className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-gold/40 cursor-pointer"
            >
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-500/15 to-cyan-500/10">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Établissements notés</h3>
                <p className="text-xs text-muted-foreground">Classement par avis Google, TripAdvisor, Guru</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/staff/animations")}
              className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-purple-500/40 cursor-pointer"
            >
              <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Animations</h3>
                <p className="text-xs text-muted-foreground">Bibliothèque d'animations CSS disponibles</p>
              </div>
            </button>
            {!isAdmin && (
              <>
                <button
                  onClick={() => navigate("/staff/brummell")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-gold/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                    <BookOpen className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Brummell Typographie</h3>
                    <p className="text-xs text-muted-foreground">Guide typographique Brummell</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/ai-effects")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-purple-500/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10">
                    <Sparkles className="h-6 w-6 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI Effects</h3>
                    <p className="text-xs text-muted-foreground">Démonstration des effets IA</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/mode-strict")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-emerald-500/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                    <Shield className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Mode Strict</h3>
                    <p className="text-xs text-muted-foreground">Page de recherche en mode strict</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/search-layouts")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-blue-500/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-sky-500/10">
                    <LayoutGrid className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Search Layouts</h3>
                    <p className="text-xs text-muted-foreground">Démo des layouts de recherche</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/demo-effects")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-pink-500/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/10">
                    <Sparkles className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Logo Effects</h3>
                    <p className="text-xs text-muted-foreground">Démonstration des effets logo</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/presentation")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-gold/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-gold/20 to-yellow-500/10">
                    <Presentation className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Présentation EN</h3>
                    <p className="text-xs text-muted-foreground">Présentation du projet (anglais)</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate("/staff/presentation-fr")}
                  className="group flex items-center gap-4 bg-background rounded-xl border p-5 text-left transition-all hover:shadow-md hover:border-gold/40 cursor-pointer"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-gold/20 to-yellow-500/10">
                    <Presentation className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Présentation FR</h3>
                    <p className="text-xs text-muted-foreground">Présentation du projet (français)</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </main>
      <ScrollToTopButton />
    </div>
  );
};

export default StaffHub;
