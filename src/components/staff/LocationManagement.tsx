import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Globe, MapPin, Building, ExternalLink } from "lucide-react";

interface Country {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  code: string | null;
  sort_order: number | null;
}

interface City {
  id: string;
  country_id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  sort_order: number | null;
  priority_score: number | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
}

const LocationManagement = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [businessCounts, setBusinessCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [selectedCountryForCity, setSelectedCountryForCity] = useState<string | null>(null);
  const { toast } = useToast();

  // Country form state
  const [countryForm, setCountryForm] = useState({
    name_fr: "",
    name_en: "",
    name_ar: "",
    code: "",
    sort_order: 0,
  });

  // City form state
  const [cityForm, setCityForm] = useState({
    country_id: "",
    name_fr: "",
    name_en: "",
    name_ar: "",
    region: "",
    latitude: "",
    longitude: "",
    sort_order: 0,
    priority_score: 0,
    wikipedia_fr: "",
    wikipedia_en: "",
    wikipedia_ar: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [countriesRes, citiesRes, businessesRes] = await Promise.all([
      supabase.from("countries").select("*").order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("businesses").select("city"),
    ]);

    if (countriesRes.error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les pays." });
    } else {
      setCountries(countriesRes.data || []);
    }

    if (citiesRes.error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les villes." });
    } else {
      setCities(citiesRes.data || []);
    }

    // Count businesses per city
    if (!businessesRes.error && businessesRes.data) {
      const counts: Record<string, number> = {};
      businessesRes.data.forEach((b) => {
        if (b.city) {
          counts[b.city] = (counts[b.city] || 0) + 1;
        }
      });
      setBusinessCounts(counts);
    }

    setLoading(false);
  };

  // Country handlers
  const handleSaveCountry = async () => {
    if (!countryForm.name_fr.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français est requis." });
      return;
    }

    const data = {
      name_fr: countryForm.name_fr.trim(),
      name_en: countryForm.name_en.trim() || null,
      name_ar: countryForm.name_ar.trim() || null,
      code: countryForm.code.trim().toUpperCase() || null,
      sort_order: countryForm.sort_order,
    };

    let error;
    if (editingCountry) {
      const res = await supabase.from("countries").update(data).eq("id", editingCountry.id);
      error = res.error;
    } else {
      const res = await supabase.from("countries").insert(data);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingCountry ? "Pays mis à jour." : "Pays créé." });
      resetCountryForm();
      setIsCountryDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteCountry = async (id: string) => {
    const citiesInCountry = cities.filter(c => c.country_id === id);
    if (citiesInCountry.length > 0) {
      toast({
        variant: "destructive",
        title: "Impossible de supprimer",
        description: `Ce pays contient ${citiesInCountry.length} ville(s). Supprimez d'abord les villes.`,
      });
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce pays ?")) return;

    const { error } = await supabase.from("countries").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Pays supprimé." });
      fetchData();
    }
  };

  const openEditCountry = (country: Country) => {
    setEditingCountry(country);
    setCountryForm({
      name_fr: country.name_fr,
      name_en: country.name_en || "",
      name_ar: country.name_ar || "",
      code: country.code || "",
      sort_order: country.sort_order || 0,
    });
    setIsCountryDialogOpen(true);
  };

  const resetCountryForm = () => {
    setEditingCountry(null);
    setCountryForm({ name_fr: "", name_en: "", name_ar: "", code: "", sort_order: 0 });
  };

  // City handlers
  const handleSaveCity = async () => {
    if (!cityForm.name_fr.trim() || !cityForm.country_id) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français et le pays sont requis." });
      return;
    }

    const data = {
      country_id: cityForm.country_id,
      name_fr: cityForm.name_fr.trim(),
      name_en: cityForm.name_en.trim() || null,
      name_ar: cityForm.name_ar.trim() || null,
      region: cityForm.region.trim() || null,
      latitude: cityForm.latitude ? parseFloat(cityForm.latitude) : null,
      longitude: cityForm.longitude ? parseFloat(cityForm.longitude) : null,
      sort_order: cityForm.sort_order,
      priority_score: cityForm.priority_score,
      wikipedia_fr: cityForm.wikipedia_fr.trim() || null,
      wikipedia_en: cityForm.wikipedia_en.trim() || null,
      wikipedia_ar: cityForm.wikipedia_ar.trim() || null,
    };

    let error;
    if (editingCity) {
      const res = await supabase.from("cities").update(data).eq("id", editingCity.id);
      error = res.error;
    } else {
      const res = await supabase.from("cities").insert(data);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingCity ? "Ville mise à jour." : "Ville créée." });
      resetCityForm();
      setIsCityDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette ville ?")) return;

    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Ville supprimée." });
      fetchData();
    }
  };

  const openEditCity = (city: City) => {
    setEditingCity(city);
    setCityForm({
      country_id: city.country_id,
      name_fr: city.name_fr,
      name_en: city.name_en || "",
      name_ar: city.name_ar || "",
      region: city.region || "",
      latitude: city.latitude?.toString() || "",
      longitude: city.longitude?.toString() || "",
      sort_order: city.sort_order || 0,
      priority_score: city.priority_score || 0,
      wikipedia_fr: city.wikipedia_fr || "",
      wikipedia_en: city.wikipedia_en || "",
      wikipedia_ar: city.wikipedia_ar || "",
    });
    setIsCityDialogOpen(true);
  };

  const openAddCity = (countryId: string) => {
    resetCityForm();
    setCityForm(prev => ({ ...prev, country_id: countryId }));
    setIsCityDialogOpen(true);
  };

  const resetCityForm = () => {
    setEditingCity(null);
    setCityForm({
      country_id: "",
      name_fr: "",
      name_en: "",
      name_ar: "",
      region: "",
      latitude: "",
      longitude: "",
      sort_order: 0,
      priority_score: 0,
      wikipedia_fr: "",
      wikipedia_en: "",
      wikipedia_ar: "",
    });
  };

  const getCitiesByCountry = (countryId: string) => {
    return cities.filter(c => c.country_id === countryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pays & Villes</h2>
          <p className="text-muted-foreground">Gérez les localisations de l'annuaire</p>
        </div>
        <Dialog open={isCountryDialogOpen} onOpenChange={(open) => {
          setIsCountryDialogOpen(open);
          if (!open) resetCountryForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-gold-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau pays
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCountry ? "Modifier le pays" : "Nouveau pays"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom (FR) *</Label>
                  <Input
                    value={countryForm.name_fr}
                    onChange={(e) => setCountryForm({ ...countryForm, name_fr: e.target.value })}
                    placeholder="France"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code ISO</Label>
                  <Input
                    value={countryForm.code}
                    onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value })}
                    placeholder="FR"
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom (EN)</Label>
                  <Input
                    value={countryForm.name_en}
                    onChange={(e) => setCountryForm({ ...countryForm, name_en: e.target.value })}
                    placeholder="France"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom (AR)</Label>
                  <Input
                    value={countryForm.name_ar}
                    onChange={(e) => setCountryForm({ ...countryForm, name_ar: e.target.value })}
                    placeholder="فرنسا"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={countryForm.sort_order}
                  onChange={(e) => setCountryForm({ ...countryForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCountryDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveCountry} className="bg-gold hover:bg-gold/90">
                  {editingCountry ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-gold/10 p-3 rounded-lg">
                <Globe className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countries.length}</p>
                <p className="text-muted-foreground text-sm">Pays</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cities.length}</p>
                <p className="text-muted-foreground text-sm">Villes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Countries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Liste des pays et villes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {countries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun pays enregistré</p>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {countries.map((country) => {
                const countryCities = getCitiesByCountry(country.id);
                return (
                  <AccordionItem key={country.id} value={country.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-gold" />
                          <span className="font-medium">{country.name_fr}</span>
                          {country.code && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">{country.code}</span>
                          )}
                          <span className="text-muted-foreground text-sm">
                            ({countryCities.length} ville{countryCities.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => openEditCountry(country)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCountry(country.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 pb-4 space-y-4">
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => openAddCity(country.id)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter une ville
                          </Button>
                        </div>
                        {countryCities.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Aucune ville</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Ville</TableHead>
                                <TableHead>Entreprises</TableHead>
                                <TableHead>Région</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Wikipedia</TableHead>
                                <TableHead>Coordonnées</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {countryCities.map((city) => (
                                <TableRow key={city.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{city.name_fr}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-medium">
                                      {businessCounts[city.name_fr] || 0}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {city.region || "—"}
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-gold/10 text-gold rounded text-sm font-medium">
                                      {city.priority_score || 0}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {city.wikipedia_fr && (
                                        <a href={city.wikipedia_fr} target="_blank" rel="noopener noreferrer" 
                                           className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition-colors">
                                          FR
                                        </a>
                                      )}
                                      {city.wikipedia_en && (
                                        <a href={city.wikipedia_en} target="_blank" rel="noopener noreferrer"
                                           className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded hover:bg-green-500/20 transition-colors">
                                          EN
                                        </a>
                                      )}
                                      {city.wikipedia_ar && (
                                        <a href={city.wikipedia_ar} target="_blank" rel="noopener noreferrer"
                                           className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-600 rounded hover:bg-orange-500/20 transition-colors">
                                          AR
                                        </a>
                                      )}
                                      {!city.wikipedia_fr && !city.wikipedia_en && !city.wikipedia_ar && "—"}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {city.latitude && city.longitude
                                      ? `${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)}`
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" onClick={() => openEditCity(city)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCity(city.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* City Dialog */}
      <Dialog open={isCityDialogOpen} onOpenChange={(open) => {
        setIsCityDialogOpen(open);
        if (!open) resetCityForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCity ? "Modifier la ville" : "Nouvelle ville"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pays *</Label>
              <Select
                value={cityForm.country_id}
                onValueChange={(val) => setCityForm({ ...cityForm, country_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom (FR) *</Label>
                <Input
                  value={cityForm.name_fr}
                  onChange={(e) => setCityForm({ ...cityForm, name_fr: e.target.value })}
                  placeholder="Casablanca"
                />
              </div>
              <div className="space-y-2">
                <Label>Région</Label>
                <Input
                  value={cityForm.region}
                  onChange={(e) => setCityForm({ ...cityForm, region: e.target.value })}
                  placeholder="Casablanca-Settat"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom (EN)</Label>
                <Input
                  value={cityForm.name_en}
                  onChange={(e) => setCityForm({ ...cityForm, name_en: e.target.value })}
                  placeholder="Casablanca"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom (AR)</Label>
                <Input
                  value={cityForm.name_ar}
                  onChange={(e) => setCityForm({ ...cityForm, name_ar: e.target.value })}
                  placeholder="الدار البيضاء"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={cityForm.latitude}
                  onChange={(e) => setCityForm({ ...cityForm, latitude: e.target.value })}
                  placeholder="33.5731"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={cityForm.longitude}
                  onChange={(e) => setCityForm({ ...cityForm, longitude: e.target.value })}
                  placeholder="-7.5898"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score de priorité</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={cityForm.priority_score}
                  onChange={(e) => setCityForm({ ...cityForm, priority_score: parseInt(e.target.value) || 0 })}
                  placeholder="0-100"
                />
              </div>
              <div className="space-y-2">
                <Label>Ordre d'affichage</Label>
                <Input
                  type="number"
                  value={cityForm.sort_order}
                  onChange={(e) => setCityForm({ ...cityForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Liens Wikipedia
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={cityForm.wikipedia_fr}
                  onChange={(e) => setCityForm({ ...cityForm, wikipedia_fr: e.target.value })}
                  placeholder="FR - https://fr.wikipedia.org/..."
                />
                <Input
                  value={cityForm.wikipedia_en}
                  onChange={(e) => setCityForm({ ...cityForm, wikipedia_en: e.target.value })}
                  placeholder="EN - https://en.wikipedia.org/..."
                />
                <Input
                  value={cityForm.wikipedia_ar}
                  onChange={(e) => setCityForm({ ...cityForm, wikipedia_ar: e.target.value })}
                  placeholder="AR - https://ar.wikipedia.org/..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCityDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveCity} className="bg-gold hover:bg-gold/90">
                {editingCity ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationManagement;
