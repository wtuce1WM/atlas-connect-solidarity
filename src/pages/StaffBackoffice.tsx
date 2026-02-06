import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Search, Edit, Trash2, Eye, Building2, Users, Folder } from "lucide-react";
import logoGold from "@/assets/logoGOLD.webp";
import BusinessForm from "@/components/staff/BusinessForm";
import BusinessTable from "@/components/staff/BusinessTable";
import UserManagement from "@/components/staff/UserManagement";
import CategoryManagement from "@/components/staff/CategoryManagement";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

const StaffBackoffice = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState("businesses");
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/staff/login");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) {
      return;
    }

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

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBusiness(null);
    fetchBusinesses();
  };

  const filteredBusinesses = businesses.filter((business) =>
    business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    business.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (business.main_category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
              className="border-background/20 text-background hover:bg-background/10"
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
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="businesses" className="gap-2">
                <Building2 className="h-4 w-4" />
                Entreprises
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Folder className="h-4 w-4" />
                Catégories
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Utilisateurs
                </TabsTrigger>
              )}
            </TabsList>

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
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
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
                    <div className="bg-secondary p-3 rounded-lg">
                      <Edit className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {businesses.filter(b => b.wtuce_status === "pending").length}
                      </p>
                      <p className="text-muted-foreground text-sm">En attente</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <BusinessTable
                businesses={filteredBusinesses}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </TabsContent>

            <TabsContent value="categories">
              <CategoryManagement />
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
