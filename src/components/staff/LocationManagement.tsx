import React, { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Globe, MapPin, Building, ExternalLink, ArrowLeft, Save, FileText, Home, ChevronDown, Compass, LocateFixed, Loader2, ImageIcon, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import LogoUploader from "./LogoUploader";

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
  
  is_active: boolean;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
  official_site_1_name: string | null;
  official_site_1_url: string | null;
  official_site_2_name: string | null;
  official_site_2_url: string | null;
  official_site_3_name: string | null;
  official_site_3_url: string | null;
  official_site_4_name: string | null;
  official_site_4_url: string | null;
  official_site_5_name: string | null;
  official_site_5_url: string | null;
  official_site_6_name: string | null;
  official_site_6_url: string | null;
  description: string | null;
  image_url: string | null;
}

interface Neighborhood {
  id: string;
  city_id: string;
  name: string;
  sort_order: number | null;
}

interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
  hook: string | null;
  description: string | null;
  sort_order: number | null;
  image_url: string | null;
}

interface PointOfInterest {
  id: string;
  city_id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  latitude: number | null;
  longitude: number | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
  official_site_fr: string | null;
  official_site_en: string | null;
  official_site_ar: string | null;
  hook: string | null;
  description: string | null;
  sort_order: number | null;
  image_url: string | null;
}
const LocationManagement = () => {
  const [geocodingField, setGeocodingField] = useState<string | null>(null);
  const [batchGeocoding, setBatchGeocoding] = useState(false);

  const handleGeocode = async (name: string, context?: string) => {
    const { data, error } = await supabase.functions.invoke('geocode-locations', {
      body: { mode: 'single', name, context },
    });
    if (error || !data?.lat) return null;
    return { lat: data.lat.toString(), lng: data.lng.toString() };
  };

  const handleBatchGeocode = async () => {
    setBatchGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-locations', {
        body: { mode: 'batch' },
      });
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
      } else {
        const total = (data.cities || 0) + (data.destinations || 0) + (data.points_of_interest || 0);
        toast({
          title: "Géocodage terminé",
          description: `${total} élément(s) mis à jour. ${data.errors?.length || 0} erreur(s).`,
        });
        fetchData();
      }
    } finally {
      setBatchGeocoding(false);
    }
  };
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [businessCounts, setBusinessCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [showCityForm, setShowCityForm] = useState(false);
  const [selectedCountryForCity, setSelectedCountryForCity] = useState<string | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [editingNeighborhood, setEditingNeighborhood] = useState<Neighborhood | null>(null);
  const [expandedCityNeighborhoods, setExpandedCityNeighborhoods] = useState<string | null>(null);
  const [citiesSectionOpen, setCitiesSectionOpen] = useState(false);
  const [destinationsSectionOpen, setDestinationsSectionOpen] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [destinationForm, setDestinationForm] = useState({
    name_fr: "", name_en: "", name_ar: "", region: "",
    latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
    hook: "", description: "", sort_order: 0, image_url: "",
  });
  const [poiSectionOpen, setPoiSectionOpen] = useState(false);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [poiForm, setPoiForm] = useState({
    city_id: "", name_fr: "", name_en: "", name_ar: "",
    latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
    official_site_fr: "", official_site_en: "", official_site_ar: "",
    hook: "", description: "", sort_order: 0, image_url: "",
  });

  // Neighborhoods full section (like POI)
  const [neighborhoodsSectionOpen, setNeighborhoodsSectionOpen] = useState(false);
  const [showNeighborhoodFullForm, setShowNeighborhoodFullForm] = useState(false);
  const [editingNeighborhoodFull, setEditingNeighborhoodFull] = useState<Neighborhood | null>(null);
  const [neighborhoodFullForm, setNeighborhoodFullForm] = useState({
    city_id: "", name: "", sort_order: 0,
  });

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
    is_active: true,
    wikipedia_fr: "",
    wikipedia_en: "",
    wikipedia_ar: "",
    official_site_1_name: "",
    official_site_1_url: "",
    official_site_2_name: "",
    official_site_2_url: "",
    official_site_3_name: "",
    official_site_3_url: "",
    official_site_4_name: "",
    official_site_4_url: "",
    official_site_5_name: "",
    official_site_5_url: "",
    official_site_6_name: "",
    official_site_6_url: "",
    description: "",
    image_url: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [countriesRes, citiesRes, businessesRes, neighborhoodsRes, destinationsRes, poisRes] = await Promise.all([
      supabase.from("countries").select("*").order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("businesses").select("city"),
      supabase.from("neighborhoods").select("*").order("sort_order") as any,
      supabase.from("destinations" as any).select("*").order("sort_order"),
      supabase.from("points_of_interest" as any).select("*").order("sort_order"),
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

    if (!neighborhoodsRes.error && neighborhoodsRes.data) {
      setNeighborhoods(neighborhoodsRes.data || []);
    }

    if (!destinationsRes.error && destinationsRes.data) {
      setDestinations((destinationsRes.data as any[]) || []);
    }

    if (!poisRes.error && poisRes.data) {
      setPois((poisRes.data as any[]) || []);
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
  const availableRegions = React.useMemo(() => {
    const regionsFromCities = cities.map(c => c.region).filter(Boolean) as string[];
    const regionsFromDestinations = destinations.map(d => d.region).filter(Boolean) as string[];
    const all = [...new Set([...regionsFromCities, ...regionsFromDestinations])];
    return all.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [cities, destinations]);

  const handleSaveCity = async () => {
    if (!cityForm.name_fr.trim() || !cityForm.country_id) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français et le pays sont requis." });
      return;
    }
    if (!cityForm.region.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "La région est requise." });
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
      
      is_active: cityForm.is_active,
      wikipedia_fr: cityForm.wikipedia_fr.trim() || null,
      wikipedia_en: cityForm.wikipedia_en.trim() || null,
      wikipedia_ar: cityForm.wikipedia_ar.trim() || null,
      official_site_1_name: cityForm.official_site_1_name.trim() || null,
      official_site_1_url: cityForm.official_site_1_url.trim() || null,
      official_site_2_name: cityForm.official_site_2_name.trim() || null,
      official_site_2_url: cityForm.official_site_2_url.trim() || null,
      official_site_3_name: cityForm.official_site_3_name.trim() || null,
      official_site_3_url: cityForm.official_site_3_url.trim() || null,
      official_site_4_name: cityForm.official_site_4_name.trim() || null,
      official_site_4_url: cityForm.official_site_4_url.trim() || null,
      official_site_5_name: cityForm.official_site_5_name.trim() || null,
      official_site_5_url: cityForm.official_site_5_url.trim() || null,
      official_site_6_name: cityForm.official_site_6_name.trim() || null,
      official_site_6_url: cityForm.official_site_6_url.trim() || null,
      description: cityForm.description.trim().slice(0, 10000) || null,
      image_url: cityForm.image_url.trim() || null,
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
      setShowCityForm(false);
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
      
      is_active: city.is_active,
      wikipedia_fr: city.wikipedia_fr || "",
      wikipedia_en: city.wikipedia_en || "",
      wikipedia_ar: city.wikipedia_ar || "",
      official_site_1_name: city.official_site_1_name || "",
      official_site_1_url: city.official_site_1_url || "",
      official_site_2_name: city.official_site_2_name || "",
      official_site_2_url: city.official_site_2_url || "",
      official_site_3_name: city.official_site_3_name || "",
      official_site_3_url: city.official_site_3_url || "",
      official_site_4_name: city.official_site_4_name || "",
      official_site_4_url: city.official_site_4_url || "",
      official_site_5_name: city.official_site_5_name || "",
      official_site_5_url: city.official_site_5_url || "",
      official_site_6_name: city.official_site_6_name || "",
      official_site_6_url: city.official_site_6_url || "",
      description: city.description || "",
      image_url: (city as any).image_url || "",
    });
    setShowCityForm(true);
  };

  const openAddCity = (countryId: string) => {
    resetCityForm();
    setCityForm(prev => ({ ...prev, country_id: countryId }));
    setShowCityForm(true);
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
      
      is_active: true,
      wikipedia_fr: "",
      wikipedia_en: "",
      wikipedia_ar: "",
      official_site_1_name: "",
      official_site_1_url: "",
      official_site_2_name: "",
      official_site_2_url: "",
      official_site_3_name: "",
      official_site_3_url: "",
      official_site_4_name: "",
      official_site_4_url: "",
      official_site_5_name: "",
      official_site_5_url: "",
      official_site_6_name: "",
      official_site_6_url: "",
      description: "",
      image_url: "",
    });
  };

  const getCitiesByCountry = (countryId: string) => {
    return cities.filter(c => c.country_id === countryId).sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  };

  const getNeighborhoodsByCity = (cityId: string) => {
    return neighborhoods.filter(n => n.city_id === cityId).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  };

  const handleSaveNeighborhood = async (cityId: string) => {
    if (!neighborhoodName.trim()) return;

    let error;
    if (editingNeighborhood) {
      const res = await (supabase.from("neighborhoods") as any).update({ name: neighborhoodName.trim() }).eq("id", editingNeighborhood.id);
      error = res.error;
    } else {
      const res = await (supabase.from("neighborhoods") as any).insert({ city_id: cityId, name: neighborhoodName.trim() });
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingNeighborhood ? "Quartier mis à jour." : "Quartier ajouté." });
      setNeighborhoodName("");
      setEditingNeighborhood(null);
      fetchData();
    }
  };

  const handleDeleteNeighborhood = async (id: string) => {
    if (!confirm("Supprimer ce quartier ?")) return;
    const { error } = await (supabase.from("neighborhoods") as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Quartier supprimé." });
      fetchData();
    }
  };

  // Neighborhood full form handlers
  const resetNeighborhoodFullForm = () => {
    setEditingNeighborhoodFull(null);
    setNeighborhoodFullForm({ city_id: "", name: "", sort_order: 0 });
  };

  const openEditNeighborhoodFull = (n: Neighborhood) => {
    setEditingNeighborhoodFull(n);
    setNeighborhoodFullForm({ city_id: n.city_id, name: n.name, sort_order: n.sort_order || 0 });
    setShowNeighborhoodFullForm(true);
  };

  const handleSaveNeighborhoodFull = async () => {
    if (!neighborhoodFullForm.name.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom est requis." });
      return;
    }
    if (!neighborhoodFullForm.city_id) {
      toast({ variant: "destructive", title: "Erreur", description: "La ville est requise." });
      return;
    }
    const data = {
      city_id: neighborhoodFullForm.city_id,
      name: neighborhoodFullForm.name.trim(),
      sort_order: neighborhoodFullForm.sort_order,
    };
    let error;
    if (editingNeighborhoodFull) {
      const res = await (supabase.from("neighborhoods") as any).update(data).eq("id", editingNeighborhoodFull.id);
      error = res.error;
    } else {
      const res = await (supabase.from("neighborhoods") as any).insert(data);
      error = res.error;
    }
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingNeighborhoodFull ? "Quartier mis à jour." : "Quartier créé." });
      resetNeighborhoodFullForm();
      setShowNeighborhoodFullForm(false);
      fetchData();
    }
  };

  const handleDeleteNeighborhoodFull = async (id: string) => {
    if (!confirm("Supprimer ce quartier ?")) return;
    const { error } = await (supabase.from("neighborhoods") as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Quartier supprimé." });
      fetchData();
    }
  };

  // Destination handlers
  const resetDestinationForm = () => {
    setEditingDestination(null);
    setDestinationForm({
      name_fr: "", name_en: "", name_ar: "", region: "",
      latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
      hook: "", description: "", sort_order: 0, image_url: "",
    });
  };

  const openEditDestination = (d: Destination) => {
    setEditingDestination(d);
    setDestinationForm({
      name_fr: d.name_fr, name_en: d.name_en || "", name_ar: d.name_ar || "",
      region: d.region || "",
      latitude: d.latitude?.toString() || "", longitude: d.longitude?.toString() || "",
      wikipedia_fr: d.wikipedia_fr || "", wikipedia_en: d.wikipedia_en || "", wikipedia_ar: d.wikipedia_ar || "",
      hook: d.hook || "", description: d.description || "", sort_order: d.sort_order || 0,
      image_url: d.image_url || "",
    });
    setShowDestinationForm(true);
  };

  const handleSaveDestination = async () => {
    if (!destinationForm.name_fr.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français est requis." });
      return;
    }
    if (!destinationForm.region.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "La région est requise." });
      return;
    }
    const data = {
      name_fr: destinationForm.name_fr.trim(),
      name_en: destinationForm.name_en.trim() || null,
      name_ar: destinationForm.name_ar.trim() || null,
      region: destinationForm.region.trim() || null,
      latitude: destinationForm.latitude ? parseFloat(destinationForm.latitude) : null,
      longitude: destinationForm.longitude ? parseFloat(destinationForm.longitude) : null,
      wikipedia_fr: destinationForm.wikipedia_fr.trim() || null,
      wikipedia_en: destinationForm.wikipedia_en.trim() || null,
      wikipedia_ar: destinationForm.wikipedia_ar.trim() || null,
      hook: destinationForm.hook.trim().slice(0, 120) || null,
      description: destinationForm.description || null,
      sort_order: destinationForm.sort_order,
      image_url: destinationForm.image_url.trim() || null,
    };
    let error;
    if (editingDestination) {
      const res = await (supabase.from("destinations" as any) as any).update(data).eq("id", editingDestination.id);
      error = res.error;
    } else {
      const res = await (supabase.from("destinations" as any) as any).insert(data);
      error = res.error;
    }
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingDestination ? "Destination mise à jour." : "Destination créée." });
      resetDestinationForm();
      setShowDestinationForm(false);
      fetchData();
    }
  };

  const handleDeleteDestination = async (id: string) => {
    if (!confirm("Supprimer cette destination ?")) return;
    const { error } = await (supabase.from("destinations" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Destination supprimée." });
      fetchData();
    }
  };

  // POI handlers
  const resetPoiForm = () => {
    setEditingPoi(null);
    setPoiForm({
      city_id: "", name_fr: "", name_en: "", name_ar: "",
      latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
      official_site_fr: "", official_site_en: "", official_site_ar: "",
      hook: "", description: "", sort_order: 0, image_url: "",
    });
  };

  const openEditPoi = (p: PointOfInterest) => {
    setEditingPoi(p);
    setPoiForm({
      city_id: p.city_id, name_fr: p.name_fr, name_en: p.name_en || "", name_ar: p.name_ar || "",
      latitude: p.latitude?.toString() || "", longitude: p.longitude?.toString() || "",
      wikipedia_fr: p.wikipedia_fr || "", wikipedia_en: p.wikipedia_en || "", wikipedia_ar: p.wikipedia_ar || "",
      official_site_fr: (p as any).official_site_fr || "", official_site_en: (p as any).official_site_en || "", official_site_ar: (p as any).official_site_ar || "",
      hook: p.hook || "", description: p.description || "", sort_order: p.sort_order || 0,
      image_url: p.image_url || "",
    });
    setShowPoiForm(true);
  };

  const handleSavePoi = async () => {
    if (!poiForm.name_fr.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français est requis." });
      return;
    }
    if (!poiForm.city_id) {
      toast({ variant: "destructive", title: "Erreur", description: "La ville est requise." });
      return;
    }
    const data = {
      city_id: poiForm.city_id,
      name_fr: poiForm.name_fr.trim(),
      name_en: poiForm.name_en.trim() || null,
      name_ar: poiForm.name_ar.trim() || null,
      latitude: poiForm.latitude ? parseFloat(poiForm.latitude) : null,
      longitude: poiForm.longitude ? parseFloat(poiForm.longitude) : null,
      wikipedia_fr: poiForm.wikipedia_fr.trim() || null,
      wikipedia_en: poiForm.wikipedia_en.trim() || null,
      wikipedia_ar: poiForm.wikipedia_ar.trim() || null,
      official_site_fr: poiForm.official_site_fr.trim() || null,
      official_site_en: poiForm.official_site_en.trim() || null,
      official_site_ar: poiForm.official_site_ar.trim() || null,
      hook: poiForm.hook.trim().slice(0, 120) || null,
      description: poiForm.description || null,
      sort_order: poiForm.sort_order,
      image_url: poiForm.image_url.trim() || null,
    };
    let error;
    if (editingPoi) {
      const res = await (supabase.from("points_of_interest" as any) as any).update(data).eq("id", editingPoi.id);
      error = res.error;
    } else {
      const res = await (supabase.from("points_of_interest" as any) as any).insert(data);
      error = res.error;
    }
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingPoi ? "Point d'intérêt mis à jour." : "Point d'intérêt créé." });
      resetPoiForm();
      setShowPoiForm(false);
      fetchData();
    }
  };

  const handleDeletePoi = async (id: string) => {
    if (!confirm("Supprimer ce point d'intérêt ?")) return;
    const { error } = await (supabase.from("points_of_interest" as any) as any).delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Point d'intérêt supprimé." });
      fetchData();
    }
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={batchGeocoding}
            onClick={handleBatchGeocode}
          >
            {batchGeocoding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
            Géocoder tout (GPS manquants)
          </Button>
        </div>
        <Dialog open={isCountryDialogOpen} onOpenChange={(open) => {
          setIsCountryDialogOpen(open);
          if (!open) resetCountryForm();
        }}>
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

      {/* Cities List — directly shown (single country: Maroc) */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setCitiesSectionOpen(!citiesSectionOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Villes du Maroc
              <ChevronDown className={`h-4 w-4 transition-transform ${citiesSectionOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            {countries.length > 0 && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAddCity(countries[0].id); }}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ville
              </Button>
            )}
          </div>
        </CardHeader>
        {citiesSectionOpen && <CardContent>
          {(() => {
            const allCities = countries.length > 0 ? getCitiesByCountry(countries[0].id) : [];
            if (allCities.length === 0) {
              return <p className="text-muted-foreground text-sm text-center py-4">Aucune ville</p>;
            }
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Ville</TableHead>
                     <TableHead>Statut</TableHead>
                     <TableHead>Entreprises</TableHead>
                     <TableHead>Région</TableHead>
                     
                     <TableHead>Wikipedia</TableHead>
                     <TableHead>Coordonnées</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCities.map((city) => {
                    const cityNeighborhoods = getNeighborhoodsByCity(city.id);
                    const isExpanded = expandedCityNeighborhoods === city.id;
                    return (
                      <React.Fragment key={city.id}>
                        <TableRow>
                         <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className={`font-medium ${!city.is_active ? 'text-muted-foreground line-through' : ''}`}>{city.name_fr}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${city.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                              {city.is_active ? 'Active' : 'Inactive'}
                            </span>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setExpandedCityNeighborhoods(isExpanded ? null : city.id);
                                setNeighborhoodName("");
                                setEditingNeighborhood(null);
                              }}
                              title="Quartiers"
                            >
                              <Home className="h-4 w-4" />
                              <span className="ml-1 text-xs">{cityNeighborhoods.length}</span>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditCity(city)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Home className="h-4 w-4" />
                                  Quartiers de {city.name_fr}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={neighborhoodName}
                                    onChange={(e) => setNeighborhoodName(e.target.value)}
                                    placeholder="Nom du quartier"
                                    className="max-w-xs h-8"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveNeighborhood(city.id);
                                    }}
                                  />
                                  <Button size="sm" onClick={() => handleSaveNeighborhood(city.id)} className="h-8">
                                    {editingNeighborhood ? "Modifier" : "Ajouter"}
                                  </Button>
                                  {editingNeighborhood && (
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                                      setEditingNeighborhood(null);
                                      setNeighborhoodName("");
                                    }}>
                                      Annuler
                                    </Button>
                                  )}
                                </div>
                                {cityNeighborhoods.length === 0 ? (
                                  <p className="text-muted-foreground text-xs">Aucun quartier</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {cityNeighborhoods.map((n) => (
                                      <div key={n.id} className="flex items-center gap-1 bg-background border rounded px-2 py-1 text-sm">
                                        <span>{n.name}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0"
                                          onClick={() => {
                                            setEditingNeighborhood(n);
                                            setNeighborhoodName(n.name);
                                          }}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>}
      </Card>

      {/* ===== QUARTIERS ===== */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setNeighborhoodsSectionOpen(!neighborhoodsSectionOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Quartiers
              <ChevronDown className={`h-4 w-4 transition-transform ${neighborhoodsSectionOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resetNeighborhoodFullForm(); setShowNeighborhoodFullForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        {neighborhoodsSectionOpen && (
          <CardContent>
            {neighborhoods.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucun quartier</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quartier</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {neighborhoods
                    .sort((a, b) => {
                      const cityA = cities.find(c => c.id === a.city_id)?.name_fr || "";
                      const cityB = cities.find(c => c.id === b.city_id)?.name_fr || "";
                      if (cityA !== cityB) return cityA.localeCompare(cityB, 'fr');
                      return (a.sort_order || 0) - (b.sort_order || 0);
                    })
                    .map((n) => {
                      const city = cities.find(c => c.id === n.city_id);
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.name}</TableCell>
                          <TableCell className="text-muted-foreground">{city?.name_fr || "—"}</TableCell>
                          <TableCell>{n.sort_order ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openEditNeighborhoodFull(n)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteNeighborhoodFull(n.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== DESTINATIONS ===== */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setDestinationsSectionOpen(!destinationsSectionOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Destinations
              <ChevronDown className={`h-4 w-4 transition-transform ${destinationsSectionOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resetDestinationForm(); setShowDestinationForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        {destinationsSectionOpen && (
          <CardContent>
            {destinations.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune destination</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Région</TableHead>
                    <TableHead>Wikipedia</TableHead>
                    <TableHead>Coordonnées</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {(d as any).image_url ? (
                          <img src={(d as any).image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{d.name_fr}</TableCell>
                      <TableCell className="text-muted-foreground">{d.region || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.wikipedia_fr && <a href={d.wikipedia_fr} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">FR</a>}
                          {d.wikipedia_en && <a href={d.wikipedia_en} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">EN</a>}
                          {d.wikipedia_ar && <a href={d.wikipedia_ar} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">AR</a>}
                          {!d.wikipedia_fr && !d.wikipedia_en && !d.wikipedia_ar && "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.latitude && d.longitude ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}` : "—"}
                      </TableCell>
                      <TableCell>{d.sort_order ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEditDestination(d)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteDestination(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== POINTS D'INTÉRÊT ===== */}
      <Card>
        <CardHeader className="cursor-pointer select-none" onClick={() => setPoiSectionOpen(!poiSectionOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Points d'intérêt
              <ChevronDown className={`h-4 w-4 transition-transform ${poiSectionOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); resetPoiForm(); setShowPoiForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        {poiSectionOpen && (
          <CardContent>
            {pois.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucun point d'intérêt</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Point d'intérêt</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Wikipedia</TableHead>
                    <TableHead>Coordonnées</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pois.map((p) => {
                    const city = cities.find(c => c.id === p.city_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          {(p as any).image_url ? (
                            <img src={(p as any).image_url} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{p.name_fr}</TableCell>
                        <TableCell className="text-muted-foreground">{city?.name_fr || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {p.wikipedia_fr && <a href={p.wikipedia_fr} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">FR</a>}
                            {p.wikipedia_en && <a href={p.wikipedia_en} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">EN</a>}
                            {p.wikipedia_ar && <a href={p.wikipedia_ar} target="_blank" rel="noopener noreferrer" className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">AR</a>}
                            {!p.wikipedia_fr && !p.wikipedia_en && !p.wikipedia_ar && "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {p.latitude && p.longitude ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` : "—"}
                        </TableCell>
                        <TableCell>{p.sort_order ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEditPoi(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeletePoi(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* POI Form Page */}
      {showPoiForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 border-b z-10">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => { resetPoiForm(); setShowPoiForm(false); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {editingPoi ? `Modifier: ${editingPoi.name_fr}` : "Nouveau point d'intérêt"}
                </h2>
              </div>
              <Button onClick={handleSavePoi} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nom (FR) *</Label>
                      <Input value={poiForm.name_fr} onChange={(e) => setPoiForm({ ...poiForm, name_fr: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom (EN)</Label>
                      <Input value={poiForm.name_en} onChange={(e) => setPoiForm({ ...poiForm, name_en: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom (AR)</Label>
                      <Input value={poiForm.name_ar} onChange={(e) => setPoiForm({ ...poiForm, name_ar: e.target.value })} dir="rtl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ville <span className="text-destructive">*</span></Label>
                      <Select
                        value={poiForm.city_id}
                        onValueChange={(value) => setPoiForm({ ...poiForm, city_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une ville" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities
                            .slice()
                            .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ordre d'affichage</Label>
                      <Input type="number" value={poiForm.sort_order} onChange={(e) => setPoiForm({ ...poiForm, sort_order: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Coordonnées GPS</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!poiForm.name_fr.trim() || geocodingField === 'poi'}
                      onClick={async () => {
                        setGeocodingField('poi');
                        const cityName = cities.find(c => c.id === poiForm.city_id)?.name_fr;
                        const coords = await handleGeocode(poiForm.name_fr, cityName);
                        if (coords) {
                          setPoiForm(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
                          toast({ title: "GPS trouvé", description: `${coords.lat}, ${coords.lng}` });
                        } else {
                          toast({ variant: "destructive", title: "Non trouvé", description: "Impossible de géolocaliser ce point d'intérêt." });
                        }
                        setGeocodingField(null);
                      }}
                    >
                      {geocodingField === 'poi' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
                      Géolocaliser
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input value={poiForm.latitude} onChange={(e) => setPoiForm({ ...poiForm, latitude: e.target.value })} placeholder="31.6295" />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input value={poiForm.longitude} onChange={(e) => setPoiForm({ ...poiForm, longitude: e.target.value })} placeholder="-7.9811" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Wikipedia</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Wikipedia FR</Label>
                    <Input value={poiForm.wikipedia_fr} onChange={(e) => setPoiForm({ ...poiForm, wikipedia_fr: e.target.value })} placeholder="https://fr.wikipedia.org/wiki/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Wikipedia EN</Label>
                    <Input value={poiForm.wikipedia_en} onChange={(e) => setPoiForm({ ...poiForm, wikipedia_en: e.target.value })} placeholder="https://en.wikipedia.org/wiki/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Wikipedia AR</Label>
                    <Input value={poiForm.wikipedia_ar} onChange={(e) => setPoiForm({ ...poiForm, wikipedia_ar: e.target.value })} placeholder="https://ar.wikipedia.org/wiki/..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ExternalLink className="h-5 w-5" /> Sites officiels</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site officiel FR</Label>
                    <Input value={poiForm.official_site_fr} onChange={(e) => setPoiForm({ ...poiForm, official_site_fr: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Site officiel EN</Label>
                    <Input value={poiForm.official_site_en} onChange={(e) => setPoiForm({ ...poiForm, official_site_en: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Site officiel AR</Label>
                    <Input value={poiForm.official_site_ar} onChange={(e) => setPoiForm({ ...poiForm, official_site_ar: e.target.value })} placeholder="https://..." dir="rtl" />
                  </div>
                </CardContent>
              </Card>

              {/* Image */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Image</CardTitle></CardHeader>
                <CardContent>
                  <LogoUploader
                    logoUrl={poiForm.image_url}
                    onChange={(url) => setPoiForm({ ...poiForm, image_url: url })}
                    businessId={editingPoi?.id || "poi"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Hook (H2) — {poiForm.hook.length}/120</CardTitle></CardHeader>
                <CardContent>
                  <Input
                    value={poiForm.hook}
                    onChange={(e) => setPoiForm({ ...poiForm, hook: e.target.value.slice(0, 120) })}
                    placeholder="Accroche courte pour ce point d'intérêt..."
                    maxLength={120}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
                <CardContent>
                  <RichTextEditor
                    content={poiForm.description}
                    onChange={(val) => setPoiForm({ ...poiForm, description: val })}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Destination Form Page */}
      {showDestinationForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 border-b z-10">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => { resetDestinationForm(); setShowDestinationForm(false); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {editingDestination ? `Modifier: ${editingDestination.name_fr}` : "Nouvelle destination"}
                </h2>
              </div>
              <Button onClick={handleSaveDestination} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>

            <div className="space-y-6">
              {/* Names */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nom (FR) *</Label>
                      <Input value={destinationForm.name_fr} onChange={(e) => setDestinationForm({ ...destinationForm, name_fr: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom (EN)</Label>
                      <Input value={destinationForm.name_en} onChange={(e) => setDestinationForm({ ...destinationForm, name_en: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom (AR)</Label>
                      <Input value={destinationForm.name_ar} onChange={(e) => setDestinationForm({ ...destinationForm, name_ar: e.target.value })} dir="rtl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Région <span className="text-destructive">*</span></Label>
                      <Select
                        value={destinationForm.region}
                        onValueChange={(value) => setDestinationForm({ ...destinationForm, region: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une région" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRegions.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ordre d'affichage</Label>
                      <Input type="number" value={destinationForm.sort_order} onChange={(e) => setDestinationForm({ ...destinationForm, sort_order: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Coordonnées GPS</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!destinationForm.name_fr.trim() || geocodingField === 'destination'}
                      onClick={async () => {
                        setGeocodingField('destination');
                        const coords = await handleGeocode(destinationForm.name_fr);
                        if (coords) {
                          setDestinationForm(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
                          toast({ title: "GPS trouvé", description: `${coords.lat}, ${coords.lng}` });
                        } else {
                          toast({ variant: "destructive", title: "Non trouvé", description: "Impossible de géolocaliser cette destination." });
                        }
                        setGeocodingField(null);
                      }}
                    >
                      {geocodingField === 'destination' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
                      Géolocaliser
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input value={destinationForm.latitude} onChange={(e) => setDestinationForm({ ...destinationForm, latitude: e.target.value })} placeholder="31.6295" />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input value={destinationForm.longitude} onChange={(e) => setDestinationForm({ ...destinationForm, longitude: e.target.value })} placeholder="-7.9811" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wikipedia */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Wikipedia</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Wikipedia FR</Label>
                    <Input value={destinationForm.wikipedia_fr} onChange={(e) => setDestinationForm({ ...destinationForm, wikipedia_fr: e.target.value })} placeholder="https://fr.wikipedia.org/wiki/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Wikipedia EN</Label>
                    <Input value={destinationForm.wikipedia_en} onChange={(e) => setDestinationForm({ ...destinationForm, wikipedia_en: e.target.value })} placeholder="https://en.wikipedia.org/wiki/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Wikipedia AR</Label>
                    <Input value={destinationForm.wikipedia_ar} onChange={(e) => setDestinationForm({ ...destinationForm, wikipedia_ar: e.target.value })} placeholder="https://ar.wikipedia.org/wiki/..." />
                  </div>
                </CardContent>
              </Card>

              {/* Image */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Image</CardTitle></CardHeader>
                <CardContent>
                  <LogoUploader
                    logoUrl={destinationForm.image_url}
                    onChange={(url) => setDestinationForm({ ...destinationForm, image_url: url })}
                    businessId={editingDestination?.id || "destination"}
                  />
                </CardContent>
              </Card>

              {/* Hook (H2) */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Hook (H2)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Input
                      value={destinationForm.hook}
                      onChange={(e) => setDestinationForm({ ...destinationForm, hook: e.target.value.slice(0, 120) })}
                      placeholder="Accroche courte pour la destination (balise H2)..."
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground text-right">{destinationForm.hook.length}/120</p>
                  </div>
                </CardContent>
              </Card>

              {/* Description Rich Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    content={destinationForm.description}
                    onChange={(val) => setDestinationForm({ ...destinationForm, description: val })}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}


      {showCityForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="container max-w-4xl mx-auto py-6 px-4">
            {/* Header with Save button */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 border-b z-10">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    resetCityForm();
                    setShowCityForm(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {editingCity ? `Modifier: ${editingCity.name_fr}` : "Nouvelle ville"}
                </h2>
              </div>
              <Button onClick={handleSaveCity} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>

            {/* Form content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informations de la ville
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Country selection */}
                <div className="space-y-2">
                  <Label>Pays *</Label>
                  <Select
                    value={cityForm.country_id}
                    onValueChange={(val) => setCityForm({ ...cityForm, country_id: val })}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Names section */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Noms</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nom (FR) *</Label>
                      <Input
                        value={cityForm.name_fr}
                        onChange={(e) => setCityForm({ ...cityForm, name_fr: e.target.value })}
                        placeholder="Casablanca"
                      />
                    </div>
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
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label>Région <span className="text-destructive">*</span></Label>
                  <Select
                    value={cityForm.region}
                    onValueChange={(value) => setCityForm({ ...cityForm, region: value })}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Sélectionner une région" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRegions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">Coordonnées GPS</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!cityForm.name_fr.trim() || geocodingField === 'city'}
                      onClick={async () => {
                        setGeocodingField('city');
                        const coords = await handleGeocode(cityForm.name_fr);
                        if (coords) {
                          setCityForm(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
                          toast({ title: "GPS trouvé", description: `${coords.lat}, ${coords.lng}` });
                        } else {
                          toast({ variant: "destructive", title: "Non trouvé", description: "Impossible de géolocaliser cette ville." });
                        }
                        setGeocodingField(null);
                      }}
                    >
                      {geocodingField === 'city' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
                      Géolocaliser
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Priority, Sort and Status */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Paramètres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ordre d'affichage</Label>
                      <Input
                        type="number"
                        value={cityForm.sort_order}
                        onChange={(e) => setCityForm({ ...cityForm, sort_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          checked={cityForm.is_active}
                          onChange={(e) => setCityForm({ ...cityForm, is_active: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{cityForm.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wikipedia Links */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Liens Wikipedia
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label>Wikipedia (FR)</Label>
                      <Input
                        value={cityForm.wikipedia_fr}
                        onChange={(e) => setCityForm({ ...cityForm, wikipedia_fr: e.target.value })}
                        placeholder="https://fr.wikipedia.org/wiki/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Wikipedia (EN)</Label>
                      <Input
                        value={cityForm.wikipedia_en}
                        onChange={(e) => setCityForm({ ...cityForm, wikipedia_en: e.target.value })}
                        placeholder="https://en.wikipedia.org/wiki/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Wikipedia (AR)</Label>
                      <Input
                        value={cityForm.wikipedia_ar}
                        onChange={(e) => setCityForm({ ...cityForm, wikipedia_ar: e.target.value })}
                        placeholder="https://ar.wikipedia.org/wiki/..."
                      />
                    </div>
                  </div>
                </div>

                {/* Official Sites */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Sites officiels
                  </h3>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <div key={num} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                        <div className="space-y-2 md:col-span-1">
                          <Label>Nom du site {num}</Label>
                          <Input
                            value={(cityForm as any)[`official_site_${num}_name`]}
                            onChange={(e) => setCityForm({ ...cityForm, [`official_site_${num}_name`]: e.target.value })}
                            placeholder={`Ex: Office du tourisme`}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>URL du site {num}</Label>
                          <Input
                            value={(cityForm as any)[`official_site_${num}_url`]}
                            onChange={(e) => setCityForm({ ...cityForm, [`official_site_${num}_url`]: e.target.value })}
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Image
                  </h3>
                  <LogoUploader
                    logoUrl={cityForm.image_url}
                    onChange={(url) => setCityForm({ ...cityForm, image_url: url })}
                    businessId={editingCity?.id || "city"}
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                    <span className="text-sm font-normal text-muted-foreground">
                      ({cityForm.description.length} / 10 000 caractères)
                    </span>
                  </h3>
                  <RichTextEditor
                    content={cityForm.description}
                    onChange={(value) => {
                      if (value.length <= 10000) {
                        setCityForm({ ...cityForm, description: value });
                      }
                    }}
                    placeholder="Description de la ville..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bottom Save button */}
            <div className="flex justify-end gap-4 mt-6 sticky bottom-0 bg-background py-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetCityForm();
                  setShowCityForm(false);
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSaveCity} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Neighborhood Full Form Page */}
      {showNeighborhoodFullForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="container max-w-2xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 border-b z-10">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => { resetNeighborhoodFullForm(); setShowNeighborhoodFullForm(false); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {editingNeighborhoodFull ? `Modifier: ${editingNeighborhoodFull.name}` : "Nouveau quartier"}
                </h2>
              </div>
              <Button onClick={handleSaveNeighborhoodFull} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du quartier <span className="text-destructive">*</span></Label>
                  <Input value={neighborhoodFullForm.name} onChange={(e) => setNeighborhoodFullForm({ ...neighborhoodFullForm, name: e.target.value })} placeholder="Ex: Guéliz" />
                </div>
                <div className="space-y-2">
                  <Label>Ville <span className="text-destructive">*</span></Label>
                  <Select value={neighborhoodFullForm.city_id} onValueChange={(value) => setNeighborhoodFullForm({ ...neighborhoodFullForm, city_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr')).map((city) => (
                        <SelectItem key={city.id} value={city.id}>{city.name_fr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordre d'affichage</Label>
                  <Input type="number" value={neighborhoodFullForm.sort_order} onChange={(e) => setNeighborhoodFullForm({ ...neighborhoodFullForm, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 mt-6 sticky bottom-0 bg-background py-4 border-t">
              <Button variant="outline" onClick={() => { resetNeighborhoodFullForm(); setShowNeighborhoodFullForm(false); }}>
                Annuler
              </Button>
              <Button onClick={handleSaveNeighborhoodFull} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManagement;
