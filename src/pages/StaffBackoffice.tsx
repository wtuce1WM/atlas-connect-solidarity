import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Search, Edit, Trash2, Eye, EyeOff, Building2, Users, Folder, MapPin, Copy, Star, UserCheck, Award, Gem, AlertTriangle, LayoutDashboard, Crown, CheckCircle, Settings2, ArrowLeft, ClipboardList, Wrench, Key, Hotel, CalendarDays, QrCode } from "lucide-react";
import logoGold from "@/assets/logoGOLDsimple.webp";
import BusinessForm from "@/components/staff/BusinessForm";
import BusinessTable, { type PriceCacheEntry } from "@/components/staff/BusinessTable";
import UserManagement from "@/components/staff/UserManagement";
import CategoryManagement from "@/components/staff/CategoryManagement";
import LocationManagement from "@/components/staff/LocationManagement";
import SponsorManagement from "@/components/staff/SponsorManagement";
import GuestManagement from "@/components/staff/GuestManagement";
import AffiliateManagement from "@/components/staff/AffiliateManagement";
import LabelManagement from "@/components/staff/LabelManagement";
import GammeManagement from "@/components/staff/GammeManagement";
import BadgeManagement from "@/components/staff/BadgeManagement";
import EngagementManagement from "@/components/staff/EngagementManagement";
import KPGroupManagement from "@/components/staff/KPGroupManagement";
import { useBusinessBrokenFiles } from "@/hooks/useBusinessBrokenFiles";
import SearchConfigManagement from "@/components/staff/SearchConfigManagement";
import { useBusinessBrokenLinks } from "@/hooks/useBusinessBrokenLinks";
import StaffDashboard from "@/components/staff/StaffDashboard";
import BusinessOverviewTab from "@/components/staff/BusinessOverviewTab";
import ScrollToTopButton from "@/components/staff/ScrollToTopButton";
import ServiceManagement from "@/components/staff/ServiceManagement";
import KeywordManagement from "@/components/staff/KeywordManagement";
import HotelMappingManagement from "@/components/staff/HotelMappingManagement";
import SocialLinksManagement from "@/components/staff/SocialLinksManagement";
import EventManagement from "@/components/staff/EventManagement";
import QRCodeManagement from "@/components/staff/QRCodeManagement";

import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

type Gamme = { id: string; name_fr: string; color_hex: string | null; text_color_hex: string | null };

// Lightweight column list for the backoffice list view.
// Excludes very heavy fields (search_vector, ai_review_summary, vacation_dates,
// opening_hours, long descriptions, etc.) that are NOT needed in the listing.
// Full row is refetched on demand when opening the editor or duplicating.
const LIST_COLUMNS = [
  "id", "name", "slug", "city", "region", "neighborhood", "country",
  "main_category", "categories", "services", "default_service",
  "gamme_id", "badge_id", "affiliate_id", "kp_regroupement", "kp_regroupement_2",
  "rating", "computed_rating", "total_review_count",
  "google_rating", "google_review_count",
  "tripadvisor_rating", "tripadvisor_review_count",
  "restaurant_guru_rating", "restaurant_guru_review_count",
  "getyourguide_rating", "getyourguide_review_count",
  "viator_rating", "viator_review_count",
  "avis_verifies_rating", "avis_verifies_review_count",
  "trustpilot_rating", "trustpilot_review_count",
  "kayak_rating", "kayak_review_count",
  "tourradar_rating", "tourradar_review_count",
  "wtuce_status", "is_active", "is_poi", "is_featured", "is_master",
  "phone", "email", "whatsapp",
  "website", "facebook_url", "instagram_url", "youtube_url", "linkedin_url",
  "twitter_url", "tiktok_url", "pinterest_url", "vimeo_url",
  "tripadvisor_url", "restaurant_guru_url", "google_maps_url", "google_reviews_url",
  "tripadvisor_review_url", "booking_url", "airbnb_url", "hotels_com_url",
  "trivago_url", "reserve_now_url", "online_shop_url", "menu_url",
  "other_booking_url", "video_1_url", "glovo_url",
  "images", "logo_url", "pdf_url", "pdf_2_url", "pdf_3_url", "label1_url",
  "engagements", "keywords", "hook_fr",
  "latitude", "longitude",
  "created_at", "updated_at",
].join(",");

const hasBackofficeAccess = (roles: Array<{ role: string }> | null | undefined) =>
  !!roles?.some((r) => r.role === "admin" || r.role === "staff");

const StaffBackoffice = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [priceCache, setPriceCache] = useState<PriceCacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"updated_at" | "created_at">("updated_at");
  const PAGE_SIZE = 50;
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

      if (!hasBackofficeAccess(roles as Array<{ role: string }> | null | undefined)) {
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
      fetchPriceCache();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/staff/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle ?edit=<businessId> query param to open business form directly
  useEffect(() => {
    const editId = searchParams.get("edit");
    const section = searchParams.get("section");
    if (!editId) return;

    void openBusinessEditor(editId, section);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("edit");
    nextParams.delete("section");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, businesses]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const data = await fetchAllRows<Business>("businesses", LIST_COLUMNS, "updated_at");
      // fetchAllRows orders ascending; reverse for newest first
      setBusinesses(data.reverse());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les entreprises.",
      });
    }
    setLoading(false);
  };

  const fetchGammes = async () => {
    const { data } = await supabase.from("gammes").select("id, name_fr, color_hex, text_color_hex").order("name_fr");
    if (data) setGammes(data);
  };

  const fetchPriceCache = async () => {
    const { data } = await supabase
      .from("hotel_price_cache")
      .select("business_id, source, price_per_night, currency");
    if (data) setPriceCache(data as PriceCacheEntry[]);
  };

  const openBusinessEditor = async (businessId: string, section?: string | null) => {
    const cachedBusiness = businesses.find((item) => item.id === businessId) || null;
    const { data, error } = await supabase.from("businesses").select("*").eq("id", businessId).single();
    const freshBusiness = (data as Business | null) || cachedBusiness;

    if (!freshBusiness) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error?.message || "Impossible de charger l'entreprise.",
      });
      return;
    }

    setActiveTab("businesses");
    setEditingBusiness(freshBusiness);
    setShowForm(true);

    if (section) {
      setTimeout(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      }, 400);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  // Fetch subcategories when category filter changes
  useEffect(() => {
    setSubcategoryFilter("all");
    if (categoryFilter === "all") {
      setSubcategories([]);
      return;
    }
    const fetchSubs = async () => {
      const { data: cat } = await supabase.from("categories").select("id").eq("name_fr", categoryFilter).single();
      if (!cat) { setSubcategories([]); return; }
      const { data } = await supabase.from("subcategories").select("id, name_fr").eq("category_id", cat.id).order("name_fr");
      setSubcategories(data || []);
    };
    fetchSubs();
  }, [categoryFilter]);

  // Reset pagination when filters or sort change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, cityFilter, categoryFilter, subcategoryFilter, sortBy]);

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
    void openBusinessEditor(business.id);
  };

  const handleDuplicate = async (business: Business) => {
    // Refetch the full row — the listing only contains a subset of columns for performance.
    const { data: fullRow } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business.id)
      .single();
    const sourceBusiness = (fullRow as Business | null) || business;

    // Create a copy of the business without id and timestamps
    const { id, created_at, updated_at, search_vector, slug, ...businessData } = sourceBusiness;
    
    // Use a temporary slug placeholder — the real slug will be generated
    // when the user saves with the correct name
    const tempSlug = `temp-${crypto.randomUUID()}`;
    
    const duplicatedBusiness = {
      ...businessData,
      name: business.name,
      is_active: false,
      slug: tempSlug,
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
      // Duplicate business_web_only and business_documents if exists
      if (data) {
        const [{ data: webOnly }, { data: docs }, { data: destinations }, { data: poiLinks }] = await Promise.all([
          supabase.from("business_web_only").select("description").eq("business_id", id).maybeSingle(),
          supabase.from("business_documents" as any).select("type, url, name, language, icon, sort_order, poi_id, destination_id").eq("business_id", id),
          supabase.from("business_destinations").select("destination_id").eq("business_id", id),
          supabase.from("business_poi_businesses").select("poi_business_id").eq("business_id", id),
        ]);
        if (webOnly) {
          await supabase.from("business_web_only").insert({
            business_id: data.id,
            description: webOnly.description,
          });
        }
        if (docs && (docs as any[]).length > 0) {
          await supabase.from("business_documents" as any).insert(
            (docs as any[]).map((d: any) => ({ business_id: data.id, type: d.type, url: d.url, name: d.name, language: d.language, icon: d.icon, sort_order: d.sort_order, poi_id: d.poi_id, destination_id: d.destination_id, linked_business_id: d.linked_business_id || null, subcategory_id: d.subcategory_id || null, service_id: d.service_id || null, city: d.city || null, neighborhood: d.neighborhood || null, description: d.description || null, price: d.price || null, price_type: d.price_type || null, thumbnail_url: d.thumbnail_url || null, popup: d.popup || false, force_external: d.force_external || false, start_date: d.start_date || null, end_date: d.end_date || null, show_on_front: d.show_on_front || false, front_sort_order: d.front_sort_order || 0 }))
          );
        }
        if (destinations && destinations.length > 0) {
          await supabase.from("business_destinations").insert(
            destinations.map((d: any) => ({ business_id: data.id, destination_id: d.destination_id }))
          );
        }
        if (poiLinks && poiLinks.length > 0) {
          await supabase.from("business_poi_businesses").insert(
            poiLinks.map((p: any) => ({ business_id: data.id, poi_business_id: p.poi_business_id }))
          );
        }
      }

      toast({
        title: "Succès",
        description: "Entreprise dupliquée avec succès.",
      });
      fetchBusinesses();
      // Open the duplicated business for editing
      if (data) {
        setEditingBusiness(data);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBusiness(null);
    setCurrentPage(1);
    fetchBusinesses();
  };

  // Derive unique cities and categories for filters
  const uniqueCities = useMemo(() => 
    [...new Set(businesses.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );
  const uniqueCategories = useMemo(() => 
    [...new Set(businesses.map(b => b.main_category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch = !searchQuery || (() => {
      const q = searchQuery.toLowerCase();
      return business.name.toLowerCase().includes(q) ||
        (business.city?.toLowerCase().includes(q)) ||
        (business.main_category?.toLowerCase().includes(q)) ||
        (business.hook_fr?.toLowerCase().includes(q)) ||
        (business.description?.toLowerCase().includes(q)) ||
        (business.keywords?.some(k => k.toLowerCase().includes(q)));
    })();
    const matchesCity = cityFilter === "all" || business.city === cityFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? business.is_active : !business.is_active);
    const matchesCategory = categoryFilter === "all" || business.main_category === categoryFilter;
    const matchesSubcategory = subcategoryFilter === "all" || (business.categories?.includes(subcategoryFilter));
    const matchesAffiliate = !affiliateFilter || business.affiliate_id === affiliateFilter;
    return matchesSearch && matchesCity && matchesStatus && matchesCategory && matchesSubcategory && matchesAffiliate;
  }).sort((a, b) => new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime());

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBusinesses = filteredBusinesses.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff/backoffice")} className="text-background/60 hover:text-background hover:bg-background/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src="/logo-gold.webp" alt="WTUCE Logo" className="h-10 w-10 object-contain" />
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
      <main className="w-full px-4 py-8">
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
              <TabsTrigger value="events" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Folder className="h-4 w-4" />
                Catégories
              </TabsTrigger>
              <TabsTrigger value="services-list" className="gap-2">
                <Wrench className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="keywords-list" className="gap-2">
                <Key className="h-4 w-4" />
                Mots-clés
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
                Gamme & Badges
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2">
                <MapPin className="h-4 w-4" />
                Pays & Villes
              </TabsTrigger>
              <TabsTrigger value="hotel-mapping" className="gap-2">
                <Hotel className="h-4 w-4" />
                Mapping Hôtels
              </TabsTrigger>
              <TabsTrigger value="qr-codes" className="gap-2">
                <QrCode className="h-4 w-4" />
                QR Codes
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Gestion des utilisateurs
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard">
              <StaffDashboard
                businesses={businesses}
                onNavigateTab={setActiveTab}
                onNewBusiness={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "instant" }); }}
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
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/10 p-3 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {businesses.filter(b => b.is_active).length}
                      </p>
                      <p className="text-muted-foreground text-sm">Activées</p>
                    </div>
                  </div>
                </div>
                <div className="bg-background rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-3 rounded-lg">
                      <EyeOff className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {businesses.filter(b => !b.is_active).length}
                      </p>
                      <p className="text-muted-foreground text-sm">Désactivées</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort tabs */}
              <div className="flex items-center gap-2">
                <Button
                  variant={sortBy === "updated_at" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("updated_at")}
                >
                  Derniers modifiés
                </Button>
                <Button
                  variant={sortBy === "created_at" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("created_at")}
                >
                  Derniers créés
                </Button>
              </div>

              {/* Actions Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, ville, catégorie, hook, description, mots-clés..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
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
                {subcategories.length > 0 && (
                  <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Sous-catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les sous-catégories</SelectItem>
                      {subcategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.name_fr}>{sub.name_fr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: "instant" }); }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle entreprise
                </Button>
              </div>

              {/* Affiliate filter badge */}
              {affiliateFilter && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 py-1 px-3">
                    <UserCheck className="h-3 w-3" />
                    Filtre affilié actif
                    <button 
                      onClick={() => setAffiliateFilter(null)}
                      className="ml-1 hover:text-destructive"
                    >
                      ✕
                    </button>
                  </Badge>
                </div>
              )}

              {/* Reset all filters */}
              {(searchQuery || cityFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || subcategoryFilter !== "all" || affiliateFilter || sortBy !== "updated_at") && (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{filteredBusinesses.length} résultat(s)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      setSearchQuery("");
                      setCityFilter("all");
                      setStatusFilter("all");
                      setCategoryFilter("all");
                      setSubcategoryFilter("all");
                      setAffiliateFilter(null);
                      setSortBy("updated_at");
                    }}
                  >
                    Effacer les filtres
                  </Button>
                </div>
              )}

              {/* Table */}
              <BusinessTable
                businesses={paginatedBusinesses}
                gammes={gammes}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                priceCache={priceCache}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredBusinesses.length} résultat(s) — page {safeCurrentPage}/{totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Précédent
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-1">…</span>}
                          <Button
                            variant={p === safeCurrentPage ? "default" : "outline"}
                            size="sm"
                            className="min-w-[36px]"
                            onClick={() => setCurrentPage(p)}
                          >
                            {p}
                          </Button>
                        </span>
                      ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
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
              <BadgeManagement onEditBusiness={async (id: string) => {
                const found = businesses.find(b => b.id === id);
                if (found) {
                  handleEdit(found);
                } else {
                  const { data } = await supabase.from("businesses").select("*").eq("id", id).single();
                  if (data) handleEdit(data as Business);
                }
              }} />
              <EngagementManagement onEditBusiness={async (id: string) => {
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

            <TabsContent value="events">
              <EventManagement />
            </TabsContent>

            <TabsContent value="overview">
              <BusinessOverviewTab
                businesses={businesses}
                loading={loading}
                onEdit={handleEdit}
              />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement />
            </TabsContent>

            <TabsContent value="locations">
              <LocationManagement />
            </TabsContent>

            <TabsContent value="services-list">
              <ServiceManagement />
            </TabsContent>

            <TabsContent value="keywords-list">
              <KeywordManagement />
            </TabsContent>

            <TabsContent value="hotel-mapping">
              <HotelMappingManagement />
            </TabsContent>

            <TabsContent value="qr-codes">
              <QRCodeManagement businesses={businesses as any} />
            </TabsContent>

          </Tabs>
        )}
      </main>

      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
};

export default StaffBackoffice;
