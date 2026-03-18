import { useState, useMemo, useEffect } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, ExternalLink, Loader2, Building2, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category { id: string; name_fr: string; }
interface Subcategory { id: string; category_id: string; name_fr: string; }

interface BusinessRow {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  services: string[];
  keywords: string[];
}

interface Props {
  categories: Category[];
  subcategories: Subcategory[];
}

const KeywordsByBusinessSection = ({ categories, subcategories }: Props) => {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [servicesBySubcategory, setServicesBySubcategory] = useState<Record<string, string[]>>({});
  const [cities, setCities] = useState<string[]>([]);

  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredSubcategories = useMemo(() => {
    if (categoryFilter === "all") return subcategories;
    return subcategories.filter(s => s.category_id === categoryFilter);
  }, [subcategories, categoryFilter]);

  useEffect(() => { setSubcategoryFilter("all"); }, [categoryFilter]);

  useEffect(() => {
    const map: Record<string, string[]> = {};
    const fetch = async () => {
      const { data } = await supabase
        .from("services")
        .select("subcategory_id, name_fr");
      if (data) {
        for (const s of data) {
          if (!map[s.subcategory_id]) map[s.subcategory_id] = [];
          map[s.subcategory_id].push(s.name_fr);
        }
      }
      setServicesBySubcategory(map);
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("city")
        .eq("is_active", true)
        .not("city", "is", null);
      if (data) {
        const unique = [...new Set(data.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
        setCities(unique);
      }
    };
    fetchCities();
  }, []);

  const fetchBusinesses = async () => {
    if (subcategoryFilter === "all") {
      setBusinesses([]);
      return;
    }
    const serviceNames = servicesBySubcategory[subcategoryFilter] || [];
    if (serviceNames.length === 0) {
      setBusinesses([]);
      return;
    }
    setLoading(true);
    const data = await fetchAllRows("businesses", "id, name, city, is_active, services, keywords", "name");
    if (data) {
      const matched = (data as any[]).filter(b => {
        const bizServices = (b.services as string[]) || [];
        return bizServices.some(s => serviceNames.includes(s));
      }).map(b => ({
        id: b.id,
        name: b.name,
        city: b.city,
        is_active: b.is_active,
        services: (b.services as string[]) || [],
        keywords: (b.keywords as string[]) || [],
      }));
      setBusinesses(matched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, [subcategoryFilter, servicesBySubcategory]);

  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    if (cityFilter !== "all") {
      result = result.filter(b => b.city === cityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.services.some(s => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [businesses, cityFilter, searchQuery]);

  const totalKeywords = useMemo(() => filteredBusinesses.reduce((sum, b) => sum + b.keywords.length, 0), [filteredBusinesses]);
  const selectedSubName = subcategories.find(s => s.id === subcategoryFilter)?.name_fr;

  // --- Keyword mutation helpers ---

  const updateBusinessKeywords = async (businessId: string, newKeywords: string[]) => {
    setSaving(true);
    const sorted = [...new Set(newKeywords.map(k => k.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const { error } = await supabase
      .from("businesses")
      .update({ keywords: sorted, updated_at: new Date().toISOString() })
      .eq("id", businessId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour des mots-clés");
      console.error(error);
      return false;
    }
    setBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, keywords: sorted } : b));
    return true;
  };

  const handleDeleteKeyword = async (businessId: string, keyword: string) => {
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;
    const success = await updateBusinessKeywords(businessId, biz.keywords.filter(k => k !== keyword));
    if (success) toast.success(`« ${keyword} » supprimé`);
  };

  const handleDeleteAll = (businessId: string, businessName: string, count: number) => {
    toast(`Supprimer les ${count} mots-clés de « ${businessName} » ?`, {
      action: {
        label: "Oui, tout supprimer",
        onClick: async () => {
          const success = await updateBusinessKeywords(businessId, []);
          if (success) toast.success("Tous les mots-clés supprimés");
        },
      },
      cancel: {
        label: "Annuler",
        onClick: () => {},
      },
      duration: 10000,
    });
  };

  const handleAddKeyword = async (businessId: string) => {
    const kw = newKeyword.trim();
    if (!kw) return;
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;
    const success = await updateBusinessKeywords(businessId, [...biz.keywords, kw]);
    if (success) {
      setNewKeyword("");
      toast.success(`« ${kw} » ajouté`);
    }
  };

  const handleBulkInject = async (businessId: string) => {
    const raw = bulkKeywords.trim();
    if (!raw) return;
    const newKws = raw.split(",").map(k => k.trim()).filter(Boolean);
    if (newKws.length === 0) return;
    const biz = businesses.find(b => b.id === businessId);
    if (!biz) return;
    const success = await updateBusinessKeywords(businessId, [...biz.keywords, ...newKws]);
    if (success) {
      setBulkKeywords("");
      toast.success(`${newKws.length} mot(s)-clé(s) ajouté(s)`);
    }
  };

  const startEditing = (businessId: string | null) => {
    setEditingBusinessId(businessId);
    setNewKeyword("");
    setBulkKeywords("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Mots-clés par Établissement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toutes les sous-catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sous-catégories</SelectItem>
              {filteredSubcategories.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name_fr}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou service…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {subcategoryFilter === "all" ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sélectionnez une sous-catégorie pour afficher les résultats.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredBusinesses.length} établissement{filteredBusinesses.length !== 1 ? "s" : ""} pour « {selectedSubName} » — {totalKeywords} mot{totalKeywords !== 1 ? "s" : ""}-clé{totalKeywords !== 1 ? "s" : ""}
            </p>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Mots-clés</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucun établissement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBusinesses.map(b => {
                      const isEditing = editingBusinessId === b.id;
                      return (
                        <TableRow key={b.id} className="align-top">
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1.5">
                                {b.keywords.length === 0 ? (
                                  <span className="text-muted-foreground text-xs italic">Aucun</span>
                                ) : (
                                  b.keywords.sort((a, c) => a.localeCompare(c, "fr")).map(kw => (
                                    <Badge
                                      key={kw}
                                      variant="secondary"
                                      className={`text-xs gap-1 ${isEditing ? "cursor-pointer hover:bg-destructive/20 hover:line-through transition-all" : ""}`}
                                      onClick={isEditing ? () => handleDeleteKeyword(b.id, kw) : undefined}
                                      title={isEditing ? `Cliquer pour supprimer « ${kw} »` : undefined}
                                    >
                                      {kw}
                                      {isEditing && <X className="h-3 w-3 text-muted-foreground" />}
                                    </Badge>
                                  ))
                                )}
                              </div>

                              {isEditing && (
                                <div className="space-y-2 pt-1 border-t border-border/50">
                                  {b.keywords.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleDeleteAll(b.id, b.name, b.keywords.length)}
                                      disabled={saving}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Tout supprimer ({b.keywords.length})
                                    </Button>
                                  )}

                                  <div className="flex gap-1.5 items-center">
                                    <Input
                                      placeholder="Ajouter un mot-clé…"
                                      value={newKeyword}
                                      onChange={e => setNewKeyword(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddKeyword(b.id); } }}
                                      className="h-7 text-xs flex-1"
                                      disabled={saving}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleAddKeyword(b.id)}
                                      disabled={saving || !newKeyword.trim()}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Ajouter
                                    </Button>
                                  </div>

                                  <div className="space-y-1">
                                    <Textarea
                                      placeholder="Coller une liste séparée par des virgules…"
                                      value={bulkKeywords}
                                      onChange={e => setBulkKeywords(e.target.value)}
                                      className="text-xs min-h-[50px]"
                                      disabled={saving}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleBulkInject(b.id)}
                                      disabled={saving || !bulkKeywords.trim()}
                                    >
                                      Injecter la liste
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-200 text-black hover:bg-green-300" : ""}>
                              {b.is_active ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <Link to={businessUrl(b)} target="_blank">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir la fiche">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                                <Link to={`/staff/catalogue?edit=${b.id}`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
                              </div>
                              <Button
                                size="sm"
                                variant={isEditing ? "default" : "outline"}
                                className="h-7 px-2 text-xs"
                                onClick={() => startEditing(isEditing ? null : b.id)}
                              >
                                {isEditing ? "Fermer" : "Éditer"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default KeywordsByBusinessSection;
