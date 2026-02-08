import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Home, Folder, MapPin, Edit, Trash2, Loader2, Star } from "lucide-react";
import SponsorForm from "./SponsorForm";

interface Sponsor {
  id: string;
  zone: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  url_fr: string | null;
  logo_big_url_fr: string | null;
  logo_small_url_fr: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const SponsorManagement = () => {
  const { toast } = useToast();
  const [activeZone, setActiveZone] = useState("home");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    fetchSponsors();
  }, []);

  const fetchSponsors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les sponsors.",
      });
    } else {
      setSponsors(data || []);
    }
    setLoading(false);
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    const { error } = await supabase
      .from('sponsors')
      .update({ is_active: !sponsor.is_active })
      .eq('id', sponsor.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut.",
      });
    } else {
      fetchSponsors();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce sponsor ?")) return;

    const { error } = await supabase
      .from('sponsors')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le sponsor.",
      });
    } else {
      toast({ title: "Succès", description: "Sponsor supprimé." });
      fetchSponsors();
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSponsor(null);
    fetchSponsors();
  };

  const handleNewSponsor = () => {
    setEditingSponsor(null);
    setShowForm(true);
  };

  const filteredSponsors = sponsors.filter(s => s.zone === activeZone);

  const getZoneIcon = (zone: string) => {
    switch (zone) {
      case "home": return <Home className="h-4 w-4" />;
      case "category": return <Folder className="h-4 w-4" />;
      case "city": return <MapPin className="h-4 w-4" />;
      default: return null;
    }
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case "home": return "Accueil";
      case "category": return "Catégorie";
      case "city": return "Ville";
      default: return zone;
    }
  };

  if (showForm) {
    return (
      <SponsorForm
        sponsor={editingSponsor}
        zone={activeZone}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setEditingSponsor(null);
        }}
      />
    );
  }

  const renderSponsorTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filteredSponsors.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Aucun sponsor pour la zone "{getZoneLabel(activeZone)}". Cliquez sur "Nouveau sponsor" pour en ajouter un.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Logo</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead className="w-24 text-center">Ordre</TableHead>
            <TableHead className="w-24 text-center">Actif</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSponsors.map((sponsor) => (
            <TableRow key={sponsor.id}>
              <TableCell>
                {sponsor.logo_small_url_fr || sponsor.logo_big_url_fr ? (
                  <img
                    src={sponsor.logo_small_url_fr || sponsor.logo_big_url_fr || ""}
                    alt={sponsor.name_fr}
                    className="w-12 h-12 object-contain rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <Star className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{sponsor.name_fr}</TableCell>
              <TableCell className="text-center">{sponsor.sort_order}</TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={sponsor.is_active}
                  onCheckedChange={() => handleToggleActive(sponsor)}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(sponsor)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDelete(sponsor.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Sponsors</h2>
          <p className="text-muted-foreground">
            Gérez les sponsors et partenaires affichés sur le site
          </p>
        </div>
        <Button onClick={handleNewSponsor} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sponsor
        </Button>
      </div>

      <Tabs value={activeZone} onValueChange={setActiveZone}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            Accueil
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
              {sponsors.filter(s => s.zone === "home").length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-2">
            <Folder className="h-4 w-4" />
            Catégorie
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
              {sponsors.filter(s => s.zone === "category").length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="city" className="gap-2">
            <MapPin className="h-4 w-4" />
            Ville
            <span className="ml-1 text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
              {sponsors.filter(s => s.zone === "city").length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-gold" />
                Sponsors - Page d'accueil
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSponsorTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-gold" />
                Sponsors - Pages Catégories
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSponsorTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="city" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gold" />
                Sponsors - Pages Villes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSponsorTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SponsorManagement;
