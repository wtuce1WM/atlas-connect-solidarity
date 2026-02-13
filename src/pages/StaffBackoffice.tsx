import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Search, Edit, Trash2, Eye, Building2, Users, Folder, MapPin, Copy, Star, UserCheck, Award, Gem, AlertTriangle, LayoutDashboard, Crown } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import BusinessForm from "@/components/staff/BusinessForm";
import BusinessTable from "@/components/staff/BusinessTable";
import UserManagement from "@/components/staff/UserManagement";
import CategoryManagement from "@/components/staff/CategoryManagement";
import LocationManagement from "@/components/staff/LocationManagement";
import SponsorManagement from "@/components/staff/SponsorManagement";
import AffiliateManagement from "@/components/staff/AffiliateManagement";
import LabelManagement from "@/components/staff/LabelManagement";
import GammeManagement from "@/components/staff/GammeManagement";
import KPGroupManagement from "@/components/staff/KPGroupManagement";
import { useBusinessBrokenFiles } from "@/hooks/useBusinessBrokenFiles";
import { useBusinessBrokenLinks } from "@/hooks/useBusinessBrokenLinks";
import StaffDashboard from "@/components/staff/StaffDashboard";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

type Gamme = { id: string; name_fr: string; color_hex: string | null };

const StaffBackoffice = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brokenFilesMap, isChecking: isCheckingBrokenFiles, hasChecked: hasCheckedBrokenFiles, checkBrokenFiles } = useBusinessBrokenFiles(businesses);
  const { brokenLinks, isChecking: isCheckingBrokenLinks, hasChecked: hasCheckedBrokenLinks, progress: brokenLinksProgress, checkBrokenLinks } = useBusinessBrokenLinks(businesses);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/staff/login");
        return;
      }

      // Check if user has staff role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/staff/login");
        return;
      }

      // Check if user is admin
      const hasAdminRole = roles.some(r => r.role === "admin");
      setIsAdmin(hasAdminRole);
      setUser(session.user);
      fetchBusinesses();
      fetchGammes();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/staff/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les entreprises.",
      });
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  };

  const fetchGammes = async () => {
    const { data } = await supabase.from("gammes").select("id, name_fr, color_hex").order("name_fr");
    if (data) setGammes(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login");
  };

  const handleDelete = async (id: string) => {

    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Entreprise supprimée avec succès.",
      });
      fetchBusinesses();
    }
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setShowForm(true);
  };

  const handleDuplicate = async (business: Business) => {
    // Create a copy of the business without id and timestamps
    const { id, created_at, updated_at, ...businessData } = business;
    
    const duplicatedBusiness = {
      ...businessData,
      name: `${business.name} (copie)`,
      is_active: false,
    };

    const { data, error } = await supabase
      .from("businesses")
      .insert(duplicatedBusiness)
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de dupliquer l'entreprise.",
      });
    } else {
      toast({
        title: "Succès",
        description: "Entreprise dupliquée avec succès.",
      });
      fetchBusinesses();
      // Open the duplicated business for editing
      if (data) {
        setEditingBusiness(data);
        setShowForm(true);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBusiness(null);
    fetchBusinesses();
  };

  // Derive unique cities and categories for filters
  const uniqueCities = useMemo(() => 
    [...new Set(businesses.map(b => b.city))].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );
  const uniqueCategories = useMemo(() => 
    [...new Set(businesses.map(b => b.main_category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch = !searchQuery || 
      business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      business.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (business.main_category?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = cityFilter === "all" || business.city === cityFilter;
    const matchesCategory = categoryFilter === "all" || business.main_category === categoryFilter;
    return matchesSearch && matchesCity && matchesCategory;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGold} alt="WTUCE Logo" className="h-10 w-10 object-contain" />
            <div>
              <span className="font-serif text-lg font-bold">
                <span className="text-gold">ONE WORLD</span> <span className="text-background">MOROCCO</span>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showForm ? (
          <BusinessForm
            business={editingBusiness}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingBusiness(null);
            }}
            brokenLinks={editingBusiness ? brokenLinks.find(bl => bl.businessId === editingBusiness.id)?.brokenUrls : undefined}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="businesses" className="gap-2">
                <Building2 className="h-4 w-4" />
                Entreprises
              </TabsTrigger>
              <TabsTrigger value="kp-groups" className="gap-2">
                <Crown className="h-4 w-4" />
                Groupes KP
              </TabsTrigger>
              <TabsTrigger value="labels" className="gap-2">
                <Award className="h-4 w-4" />
                Labels
              </TabsTrigger>
              <TabsTrigger value="gammes" className="gap-2">
                <Gem className="h-4 w-4" />
                Gamme
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Folder className="h-4 w-4" />
                Catégories
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" />
                Pays & Villes
              </TabsTrigger>
              <TabsTrigger value="sponsors" className="gap-2">
                <Star className="h-4 w-4" />
                Sponsors
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Affiliés
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Utilisateurs
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard">
              <StaffDashboard
                businesses={businesses}
                onNavigateTab={setActiveTab}
                onNewBusiness={() => setShowForm(true)}
                onEditBusiness={handleEdit}
                brokenFilesMap={brokenFilesMap}
                isCheckingBrokenFiles={isCheckingBrokenFiles}
                hasCheckedBrokenFiles={hasCheckedBrokenFiles}
                onCheckBrokenFiles={checkBrokenFiles}
                brokenLinks={brokenLinks}
                isCheckingBrokenLinks={isCheckingBrokenLinks}
                hasCheckedBrokenLinks={hasCheckedBrokenLinks}
                brokenLinksProgress={brokenLinksProgress}
                onCheckBrokenLinks={checkBrokenLinks}
              />
            </TabsContent>

            <TabsContent value="businesses" className="space-y-6">
              {/* Actions Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, ville ou catégorie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ville" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle entreprise
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="bg-gold/10 p-3 rounded-lg">
                      <Building2 className="h-6 w-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{businesses.length}</p>
                      <p className="text-muted-foreground text-sm">Entreprises totales</p>
                    </div>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Eye className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {businesses.filter(b => b.wtuce_status === "verified").length}
                      </p>
                      <p className="text-muted-foreground text-sm">Vérifiées</p>
                    </div>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 p-3 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {businesses.filter(b => !b.images || b.images.length === 0).length}
                      </p>
                      <p className="text-muted-foreground text-sm">Sans images</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <BusinessTable
                businesses={filteredBusinesses}
                gammes={gammes}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            </TabsContent>

            <TabsContent value="labels">
              <LabelManagement />
            </TabsContent>

            <TabsContent value="gammes">
              <GammeManagement onEditBusiness={async (id: string) => {
                const found = businesses.find(b => b.id === id);
                if (found) {
                  handleEdit(found);
                } else {
                  const { data } = await supabase.from("businesses").select("*").eq("id", id).single();
                  if (data) handleEdit(data as Business);
                }
              }} />
            </TabsContent>

            <TabsContent value="kp-groups">
              <KPGroupManagement onEditBusiness={async (id: string) => {
                const found = businesses.find(b => b.id === id);
                if (found) {
                  handleEdit(found);
                } else {
                  const { data } = await supabase.from("businesses").select("*").eq("id", id).single();
                  if (data) handleEdit(data as Business);
                }
              }} />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement />
            </TabsContent>

            <TabsContent value="locations">
              <LocationManagement />
            </TabsContent>

            <TabsContent value="sponsors">
              <SponsorManagement />
            </TabsContent>

            <TabsContent value="affiliates">
              <AffiliateManagement />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default StaffBackoffice;
