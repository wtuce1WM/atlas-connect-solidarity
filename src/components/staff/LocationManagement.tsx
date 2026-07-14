import React, { useState, useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, Globe, MapPin, Building, ExternalLink, ArrowLeft, Save, FileText, Home, ChevronDown, Compass, LocateFixed, Loader2, ImageIcon, X, Search, Map, Video, GripVertical, Download } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "./RichTextEditor";
import LogoUploader from "./LogoUploader";
import ImageUploader from "./ImageUploader";
import DestinationReviewsEditor from "./DestinationReviewsEditor";

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
  keywords: string[] | null;
  
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
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  hook: string | null;
  description: string | null;
  keywords: string[] | null;
}

interface Destination {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  region: string[] | null;
  latitude: number | null;
  longitude: number | null;
  wikipedia_fr: string | null;
  wikipedia_en: string | null;
  wikipedia_ar: string | null;
  hook: string | null;
  description: string | null;
  sort_order: number | null;
  image_url: string | null;
  keywords: string[] | null;
  is_searchable: boolean;
  internal_notes?: string | null;
  videos: string[] | null;
  city_ids: string[] | null;
  google_maps_url: string | null;
  google_reviews_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  computed_rating: number | null;
  total_review_count: number | null;
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
  keywords: string[] | null;
}

const MAX_DEST_VIDEOS = 30;

const getYouTubeId = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
};

const isDirectVideo = (url: string) => /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);

const SortableDestVideo = ({ id, url, index, onRemove }: { id: string; url: string; index: number; onRemove: (i: number) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const ytId = getYouTubeId(url);
  const direct = isDirectVideo(url);

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 bg-background rounded-lg border p-2 items-start group">
      <button type="button" {...attributes} {...listeners} className="mt-1 shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="shrink-0 w-32 h-20 rounded overflow-hidden bg-muted flex items-center justify-center">
        {ytId ? (
          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="YouTube thumbnail" className="w-full h-full object-cover" />
        ) : direct ? (
          <video src={url} muted className="w-full h-full object-cover" preload="metadata" />
        ) : (
          <Video className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs truncate block">{url.length > 80 ? url.slice(0, 80) + "…" : url}</span>
        {ytId && <span className="text-[10px] text-muted-foreground">YouTube</span>}
        {direct && <span className="text-[10px] text-muted-foreground">Vidéo directe</span>}
      </div>
      <button type="button" onClick={() => onRemove(index)} className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

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
   const [neighborhoodBusinessCounts, setNeighborhoodBusinessCounts] = useState<Record<string, number>>({});
   const [destinationBusinessCounts, setDestinationBusinessCounts] = useState<Record<string, number>>({});
   const [destinationBusinessNames, setDestinationBusinessNames] = useState<{destId: string; names: string[]} | null>(null);
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
  const [inlineKeywordInput, setInlineKeywordInput] = useState("");
  const [citiesSectionOpen, setCitiesSectionOpen] = useState(false);
  // Regions
  const [regionsFromTable, setRegionsFromTable] = useState<{id: string; name: string; sort_order: number | null}[]>([]);
  const [regionsSectionOpen, setRegionsSectionOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<{id: string; name: string; sort_order: number | null} | null>(null);
  const [regionForm, setRegionForm] = useState({ name: "", sort_order: 0 });
  const [showRegionForm, setShowRegionForm] = useState(false);
  const regionsSectionRef = useRef<HTMLDivElement>(null);
  const [destinationsSectionOpen, setDestinationsSectionOpen] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [destinationForm, setDestinationForm] = useState({
    name_fr: "", name_en: "", name_ar: "", regions: [] as string[],
    latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
    hook: "", description: "", sort_order: 0, image_url: "", keywords: [] as string[],
    is_searchable: false, images: [] as string[], internal_notes: "", videos: [] as string[],
    city_ids: [] as string[],
    google_maps_url: "", google_reviews_url: "", google_rating: "", google_review_count: "",
  });
  const [destVideoUrlInput, setDestVideoUrlInput] = useState("");
  const [poiSectionOpen, setPoiSectionOpen] = useState(false);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [editingPoi, setEditingPoi] = useState<PointOfInterest | null>(null);
  const [poiForm, setPoiForm] = useState({
    city_id: "", name_fr: "", name_en: "", name_ar: "",
    latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
    official_site_fr: "", official_site_en: "", official_site_ar: "",
    hook: "", description: "", sort_order: 0, image_url: "", keywords: [] as string[],
    images: [] as string[], internal_notes: "",
  });
  const [poiKeywordInput, setPoiKeywordInput] = useState("");
  const destinationKeywordInputRef = useRef<HTMLInputElement>(null);

  // Neighborhoods full section (like POI)
  const [neighborhoodsSectionOpen, setNeighborhoodsSectionOpen] = useState(false);

  // Section refs for auto-scroll
  const citiesSectionRef = useRef<HTMLDivElement>(null);
  const neighborhoodFormRef = useRef<HTMLDivElement>(null);
  const neighborhoodsSectionRef = useRef<HTMLDivElement>(null);
  const destinationsSectionRef = useRef<HTMLDivElement>(null);
  const poiSectionRef = useRef<HTMLDivElement>(null);
  const [showNeighborhoodFullForm, setShowNeighborhoodFullForm] = useState(false);
  const [editingNeighborhoodFull, setEditingNeighborhoodFull] = useState<Neighborhood | null>(null);
  const [neighborhoodFullForm, setNeighborhoodFullForm] = useState({
    city_id: "", name: "", sort_order: 0,
    latitude: "", longitude: "", image_url: "", hook: "", description: "",
    keywords: [] as string[],
  });

  // Filters
  const [neighborhoodCityFilter, setNeighborhoodCityFilter] = useState<string>("");
  const [poiCityFilter, setPoiCityFilter] = useState<string>("all");
  const [destinationRegionFilter, setDestinationRegionFilter] = useState<string>("all");

  const { toast } = useToast();

  const downloadBusinessImages = async (label: string, filterFn: () => Promise<string[]>) => {
    toast({ title: "Téléchargement des images en cours…" });
    try {
      const urls = await filterFn();
      if (urls.length === 0) {
        toast({ variant: "destructive", title: "Aucune image", description: "Aucune image trouvée." });
        return;
      }
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let downloaded = 0;
      await Promise.all(
        urls.map(async (url, i) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return;
            const blob = await res.blob();
            const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
            const filename = `${String(i + 1).padStart(3, "0")}.${ext}`;
            zip.file(filename, blob);
            downloaded++;
          } catch {
            // skip broken images
          }
        })
      );
      if (downloaded === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucune image n'a pu être téléchargée." });
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `images-${label.replace(/[^a-zA-Z0-9]/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: `${downloaded} image(s) téléchargées en .zip` });
    } catch {
      toast({ variant: "destructive", title: "Erreur lors du téléchargement" });
    }
  };

  const fetchCityImages = (cityName: string) => downloadBusinessImages(cityName, async () => {
    const { data } = await supabase.from("businesses").select("images").eq("city", cityName).eq("is_active", true);
    return (data || []).flatMap((b: any) => b.images || []).filter(Boolean);
  });

  const fetchNeighborhoodImages = (neighborhoodName: string, cityName: string) => downloadBusinessImages(`${neighborhoodName}-${cityName}`, async () => {
    const { data } = await supabase.from("businesses").select("images").eq("neighborhood", neighborhoodName).eq("city", cityName).eq("is_active", true);
    return (data || []).flatMap((b: any) => b.images || []).filter(Boolean);
  });

  const fetchDestinationImages = (destId: string, destName: string) => downloadBusinessImages(destName, async () => {
    const { data } = await supabase.from("business_destinations" as any).select("business_id, businesses!inner(images)").eq("destination_id", destId) as any;
    return (data || []).flatMap((r: any) => r.businesses?.images || []).filter(Boolean);
  });

  const fetchPoiImages = (poiId: string, poiName: string) => downloadBusinessImages(poiName, async () => {
    const { data } = await supabase.from("business_points_of_interest" as any).select("business_id, businesses:business_id(images)").eq("point_of_interest_id", poiId) as any;
    return (data || []).flatMap((r: any) => {
      const biz = r.businesses;
      if (Array.isArray(biz)) return biz.flatMap((b: any) => b.images || []);
      return biz?.images || [];
    }).filter(Boolean);
  });

  const destVideoSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    keywords: [] as string[],
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
    
    const [countriesRes, citiesRes, businessesRes, neighborhoodsRes, destinationsRes, poisRes, businessDestRes, regionsRes] = await Promise.all([
      supabase.from("countries").select("*").order("sort_order"),
      supabase.from("cities").select("*").order("sort_order"),
      supabase.from("businesses").select("city, neighborhood").eq("is_active", true),
      supabase.from("neighborhoods").select("*").order("sort_order") as any,
      supabase.from("destinations" as any).select("*").order("name_fr"),
      supabase.from("points_of_interest" as any).select("*").order("sort_order"),
      supabase.from("business_destinations" as any).select("destination_id"),
      supabase.from("regions" as any).select("*").order("name"),
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

    // Count businesses per city and per city+neighborhood
    if (!businessesRes.error && businessesRes.data) {
      const counts: Record<string, number> = {};
      const nhCounts: Record<string, number> = {};
      businessesRes.data.forEach((b: any) => {
        if (b.city) {
          counts[b.city] = (counts[b.city] || 0) + 1;
        }
        if (b.neighborhood) {
          const nhKey = b.neighborhood.toLowerCase();
          const cityNhKey = (b.city || "").toLowerCase() + "|" + nhKey;
          nhCounts[nhKey] = (nhCounts[nhKey] || 0) + 1;
          nhCounts[cityNhKey] = (nhCounts[cityNhKey] || 0) + 1;
        }
      });
      setBusinessCounts(counts);
      setNeighborhoodBusinessCounts(nhCounts);
    }

    if (!neighborhoodsRes.error && neighborhoodsRes.data) {
      setNeighborhoods(neighborhoodsRes.data || []);
    }

    if (!destinationsRes.error && destinationsRes.data) {
      setDestinations((destinationsRes.data as any[]) || []);
    }

    if (!businessDestRes.error && businessDestRes.data) {
      const destCounts: Record<string, number> = {};
      (businessDestRes.data as any[]).forEach((bd: any) => {
        destCounts[bd.destination_id] = (destCounts[bd.destination_id] || 0) + 1;
      });
      setDestinationBusinessCounts(destCounts);
    }

    if (!poisRes.error && poisRes.data) {
      setPois((poisRes.data as any[]) || []);
    }

    if (!regionsRes.error && regionsRes.data) {
      setRegionsFromTable((regionsRes.data as any[]) || []);
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

  // Region CRUD handlers
  const availableRegions = React.useMemo(() => {
    return regionsFromTable.map(r => r.name).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [regionsFromTable]);

  const openAddRegion = () => {
    setEditingRegion(null);
    setRegionForm({ name: "", sort_order: 0 });
    setShowRegionForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const openEditRegion = (r: {id: string; name: string; sort_order: number | null}) => {
    setEditingRegion(r);
    setRegionForm({ name: r.name, sort_order: r.sort_order || 0 });
    setShowRegionForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const handleSaveRegion = async () => {
    if (!regionForm.name.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom est requis." });
      return;
    }
    const payload = { name: regionForm.name.trim(), sort_order: regionForm.sort_order };
    let error;
    if (editingRegion) {
      const oldName = editingRegion.name;
      const res = await supabase.from("regions" as any).update(payload).eq("id", editingRegion.id);
      error = res.error;
      // Propagate rename to cities and destinations
      if (!error && oldName !== payload.name) {
        await supabase.from("cities").update({ region: payload.name } as any).eq("region", oldName);
        // For destinations with text[] region, we'd need a manual update — skip for now as it's complex
      }
    } else {
      const res = await supabase.from("regions" as any).insert(payload);
      error = res.error;
    }
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: editingRegion ? "Région mise à jour." : "Région créée." });
      setShowRegionForm(false);
      fetchData();
    }
  };

  const handleDeleteRegion = async (r: {id: string; name: string}) => {
    const citiesInRegion = cities.filter(c => c.region === r.name).length;
    if (citiesInRegion > 0) {
      toast({ variant: "destructive", title: "Impossible", description: `${citiesInRegion} ville(s) utilisent cette région.` });
      return;
    }
    if (!confirm(`Supprimer la région « ${r.name} » ?`)) return;
    const { error } = await supabase.from("regions" as any).delete().eq("id", r.id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Succès", description: "Région supprimée." });
      fetchData();
    }
  };

  // City handlers

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
      keywords: cityForm.keywords.length > 0 ? cityForm.keywords : [],
    };

    console.log("[handleSaveCity] keywords in form:", JSON.stringify(cityForm.keywords));
    console.log("[handleSaveCity] keywords in payload:", JSON.stringify(data.keywords));
    console.log("[handleSaveCity] full payload:", JSON.stringify(data));

    let error;
    let responseData;
    if (editingCity) {
      console.log("[handleSaveCity] Updating city:", editingCity.id);
      const res = await supabase.from("cities").update(data).eq("id", editingCity.id).select();
      error = res.error;
      responseData = res.data;
      console.log("[handleSaveCity] Update response:", JSON.stringify({ error: res.error, data: res.data, status: res.status }));
    } else {
      const res = await supabase.from("cities").insert(data).select();
      error = res.error;
      responseData = res.data;
      console.log("[handleSaveCity] Insert response:", JSON.stringify({ error: res.error, data: res.data, status: res.status }));
    }

    if (error) {
      console.error("[handleSaveCity] Error:", error.message, error.details, error.hint);
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      console.log("[handleSaveCity] Success! Returned keywords:", responseData?.[0]?.keywords);
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
      keywords: city.keywords || [],
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
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
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
      keywords: [],
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
    setNeighborhoodFullForm({ city_id: "", name: "", sort_order: 0, latitude: "", longitude: "", image_url: "", hook: "", description: "", keywords: [] });
  };

  const openEditNeighborhoodFull = (n: Neighborhood) => {
    setEditingNeighborhoodFull(n);
    setNeighborhoodFullForm({
      city_id: n.city_id, name: n.name, sort_order: n.sort_order || 0,
      latitude: n.latitude?.toString() || "", longitude: n.longitude?.toString() || "",
      image_url: n.image_url || "", hook: n.hook || "", description: n.description || "",
      keywords: n.keywords || [],
    });
    setShowNeighborhoodFullForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const neighborhoodKeywordInputRef = useRef<HTMLInputElement>(null);

  const handleSaveNeighborhoodFull = async () => {
    if (!neighborhoodFullForm.name.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom est requis." });
      return;
    }
    if (!neighborhoodFullForm.city_id) {
      toast({ variant: "destructive", title: "Erreur", description: "La ville est requise." });
      return;
    }
    // Auto-fuse pending keyword input
    let finalKeywords = [...neighborhoodFullForm.keywords];
    const pending = neighborhoodKeywordInputRef.current?.value?.trim();
    if (pending && !finalKeywords.includes(pending)) {
      finalKeywords.push(pending);
      neighborhoodKeywordInputRef.current!.value = '';
    }
    const data = {
      city_id: neighborhoodFullForm.city_id,
      name: neighborhoodFullForm.name.trim(),
      sort_order: neighborhoodFullForm.sort_order,
      latitude: neighborhoodFullForm.latitude ? parseFloat(neighborhoodFullForm.latitude) : null,
      longitude: neighborhoodFullForm.longitude ? parseFloat(neighborhoodFullForm.longitude) : null,
      image_url: neighborhoodFullForm.image_url.trim() || null,
      hook: neighborhoodFullForm.hook.trim().slice(0, 120) || null,
      description: neighborhoodFullForm.description || null,
      keywords: finalKeywords.length > 0 ? finalKeywords : [],
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
      name_fr: "", name_en: "", name_ar: "", regions: [],
      latitude: "", longitude: "", wikipedia_fr: "", wikipedia_en: "", wikipedia_ar: "",
      hook: "", description: "", sort_order: 0, image_url: "", keywords: [] as string[],
      is_searchable: false, images: [] as string[], internal_notes: "", videos: [] as string[],
      city_ids: [] as string[],
      google_maps_url: "", google_reviews_url: "", google_rating: "", google_review_count: "",
    });
    setDestVideoUrlInput("");
  };

  const openEditDestination = async (d: Destination) => {
    setEditingDestination(d);
    const { data: noteRow } = await supabase
      .from("destination_internal_notes")
      .select("notes")
      .eq("destination_id", d.id)
      .maybeSingle();
    setDestinationForm({
      name_fr: d.name_fr, name_en: d.name_en || "", name_ar: d.name_ar || "",
      regions: d.region || [],
      latitude: d.latitude?.toString() || "", longitude: d.longitude?.toString() || "",
      wikipedia_fr: d.wikipedia_fr || "", wikipedia_en: d.wikipedia_en || "", wikipedia_ar: d.wikipedia_ar || "",
      hook: d.hook || "", description: d.description || "", sort_order: d.sort_order || 0,
      image_url: d.image_url || "", keywords: d.keywords || [],
      is_searchable: (d as any).is_searchable ?? false,
      images: (d as any).images || [],
      internal_notes: noteRow?.notes || "",
      videos: d.videos || [],
      city_ids: (d as any).city_ids || [],
      google_maps_url: d.google_maps_url || "",
      google_reviews_url: d.google_reviews_url || "",
      google_rating: d.google_rating?.toString() ?? "",
      google_review_count: d.google_review_count?.toString() ?? "",
    });
    setShowDestinationForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const handleSaveDestination = async () => {
    if (!destinationForm.name_fr.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom français est requis." });
      return;
    }
    if (destinationForm.regions.length === 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Au moins une région est requise." });
      return;
    }
    // Auto-fuse pending keyword input
    let finalKeywords = [...destinationForm.keywords];
    const pending = destinationKeywordInputRef.current?.value?.trim();
    if (pending && !finalKeywords.includes(pending)) {
      finalKeywords.push(pending);
      destinationKeywordInputRef.current!.value = '';
    }
    const data = {
      name_fr: destinationForm.name_fr.trim(),
      name_en: destinationForm.name_en.trim() || null,
      name_ar: destinationForm.name_ar.trim() || null,
      region: destinationForm.regions,
      latitude: destinationForm.latitude ? parseFloat(destinationForm.latitude) : null,
      longitude: destinationForm.longitude ? parseFloat(destinationForm.longitude) : null,
      wikipedia_fr: destinationForm.wikipedia_fr.trim() || null,
      wikipedia_en: destinationForm.wikipedia_en.trim() || null,
      wikipedia_ar: destinationForm.wikipedia_ar.trim() || null,
      hook: destinationForm.hook.trim().slice(0, 120) || null,
      description: destinationForm.description || null,
      sort_order: destinationForm.sort_order,
      image_url: destinationForm.image_url.trim() || null,
      keywords: finalKeywords.length > 0 ? finalKeywords : [],
      is_searchable: destinationForm.is_searchable,
      images: destinationForm.images.length > 0 ? destinationForm.images : [],
      internal_notes: destinationForm.internal_notes.trim().slice(0, 5000) || null,
      videos: destinationForm.videos.length > 0 ? destinationForm.videos : [],
      city_ids: destinationForm.city_ids.length > 0 ? destinationForm.city_ids : [],
      google_maps_url: destinationForm.google_maps_url.trim() || null,
      google_reviews_url: destinationForm.google_reviews_url.trim() || null,
      google_rating: destinationForm.google_rating ? parseFloat(destinationForm.google_rating) : null,
      google_review_count: destinationForm.google_review_count ? parseInt(destinationForm.google_review_count) : null,
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
      hook: "", description: "", sort_order: 0, image_url: "", keywords: [] as string[],
      images: [] as string[], internal_notes: "",
    });
    setPoiKeywordInput("");
  };

  const openEditPoi = (p: PointOfInterest) => {
    setEditingPoi(p);
    setPoiForm({
      city_id: p.city_id, name_fr: p.name_fr, name_en: p.name_en || "", name_ar: p.name_ar || "",
      latitude: p.latitude?.toString() || "", longitude: p.longitude?.toString() || "",
      wikipedia_fr: p.wikipedia_fr || "", wikipedia_en: p.wikipedia_en || "", wikipedia_ar: p.wikipedia_ar || "",
      official_site_fr: (p as any).official_site_fr || "", official_site_en: (p as any).official_site_en || "", official_site_ar: (p as any).official_site_ar || "",
      hook: p.hook || "", description: p.description || "", sort_order: p.sort_order || 0,
      image_url: p.image_url || "", keywords: p.keywords || [],
      images: (p as any).images || [], internal_notes: (p as any).internal_notes || "",
    });
    setPoiKeywordInput("");
    setShowPoiForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const addPoiKeyword = () => {
    const val = poiKeywordInput.trim();
    if (!val) return;
    setPoiForm(prev => {
      if (prev.keywords.includes(val)) return prev;
      return { ...prev, keywords: [...prev.keywords, val] };
    });
    setPoiKeywordInput("");
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

    const mergedKeywords = Array.from(new Set([...poiForm.keywords, poiKeywordInput.trim()].filter(Boolean))); 

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
      keywords: mergedKeywords,
      images: poiForm.images.length > 0 ? poiForm.images : [],
      internal_notes: poiForm.internal_notes.trim().slice(0, 5000) || null,
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
      <Card ref={citiesSectionRef} style={{ scrollMarginTop: '80px' }}>
        <CardHeader className="cursor-pointer select-none" onClick={() => {
          const opening = !citiesSectionOpen;
          setCitiesSectionOpen(opening);
          if (opening) setTimeout(() => citiesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }}>
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
                     <TableHead>Mots clés</TableHead>
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
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                              {city.keywords?.length || 0}
                            </span>
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
                            <Button size="sm" variant="ghost" title="Télécharger les images" onClick={() => fetchCityImages(city.name_fr)}>
                              <Download className="h-4 w-4" />
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
                                        <span className="text-xs text-muted-foreground ml-1">({neighborhoodBusinessCounts[city.name_fr.toLowerCase() + "|" + n.name.toLowerCase()] || 0})</span>
                                        <a href={`/search?q=${encodeURIComponent(n.name + ' ' + city.name_fr)}`} target="_blank" rel="noopener noreferrer" className="h-5 w-5 p-0 inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" title="Rechercher">
                                          <Search className="h-3 w-3" />
                                        </a>
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

                              {/* Mots-clés inline */}
                              <div className="border-t pt-3 mt-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <FileText className="h-4 w-4" />
                                  Mots-clés / Variantes orthographiques
                                  {(city.keywords?.length ?? 0) > 0 && (
                                    <span className="text-xs bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                      {city.keywords!.length}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={expandedCityNeighborhoods === city.id ? inlineKeywordInput : ""}
                                    onChange={(e) => setInlineKeywordInput(e.target.value)}
                                    placeholder="Ajouter un mot-clé puis Entrée"
                                    className="max-w-xs h-8"
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter" && inlineKeywordInput.trim()) {
                                        const kw = inlineKeywordInput.trim();
                                        const existing = city.keywords || [];
                                        if (existing.includes(kw)) {
                                          setInlineKeywordInput("");
                                          return;
                                        }
                                        const updated = [...existing, kw];
                                        const { error } = await supabase.from("cities").update({ keywords: updated }).eq("id", city.id);
                                        if (!error) {
                                          setCities(prev => prev.map(c => c.id === city.id ? { ...c, keywords: updated } : c));
                                          setInlineKeywordInput("");
                                          toast({ title: "Mot-clé ajouté" });
                                        }
                                      }
                                    }}
                                  />
                                </div>
                                {(city.keywords?.length ?? 0) > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {city.keywords!.map((kw, idx) => (
                                      <span key={idx} className="inline-flex items-center gap-1 bg-background border rounded px-2 py-0.5 text-xs">
                                        {kw}
                                        <button
                                          className="text-destructive hover:text-destructive/80 ml-0.5"
                                          onClick={async () => {
                                            const updated = city.keywords!.filter((_, i) => i !== idx);
                                            const { error } = await supabase.from("cities").update({ keywords: updated }).eq("id", city.id);
                                            if (!error) {
                                              setCities(prev => prev.map(c => c.id === city.id ? { ...c, keywords: updated } : c));
                                              toast({ title: "Mot-clé supprimé" });
                                            }
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
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

      {/* ===== RÉGIONS ===== */}
      <Card ref={regionsSectionRef} style={{ scrollMarginTop: '80px' }}>
        <CardHeader className="cursor-pointer select-none" onClick={() => {
          const opening = !regionsSectionOpen;
          setRegionsSectionOpen(opening);
          if (opening) setTimeout(() => regionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Régions
              <span className="text-sm font-normal text-muted-foreground">({regionsFromTable.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${regionsSectionOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAddRegion(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        {regionsSectionOpen && (
          <CardContent>
            {regionsFromTable.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune région</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Région</TableHead>
                    <TableHead>Villes</TableHead>
                    <TableHead>Destinations</TableHead>
                    <TableHead>Établissements</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionsFromTable
                    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                    .map((r) => {
                      const regionCities = cities.filter(c => c.region === r.name);
                      const citiesCount = regionCities.length;
                      const destsCount = destinations.filter(d => (d.region || []).includes(r.name)).length;
                      const bizCount = regionCities.reduce((sum, c) => sum + (businessCounts[c.name_fr] || 0), 0);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-medium">
                              {citiesCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                              {destsCount}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-medium">
                              {bizCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => openEditRegion(r)}>
                              <Edit className="h-4 w-4" />
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

      {/* ===== QUARTIERS ===== */}
      <Card ref={neighborhoodsSectionRef} style={{ scrollMarginTop: '80px' }}>
        <CardHeader className="cursor-pointer select-none" onClick={() => {
          const opening = !neighborhoodsSectionOpen;
          setNeighborhoodsSectionOpen(opening);
          if (opening) setTimeout(() => neighborhoodsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }}>
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
            <div className="mb-4">
              <Select value={neighborhoodCityFilter} onValueChange={setNeighborhoodCityFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filtrer par ville" />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(c => neighborhoods.some(n => n.city_id === c.id))
                    .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {!neighborhoodCityFilter ? (
              <p className="text-muted-foreground text-sm text-center py-4">Sélectionnez une ville pour afficher ses quartiers</p>
            ) : neighborhoods.filter(n => n.city_id === neighborhoodCityFilter).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucun quartier pour cette ville</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Quartier</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Établissements</TableHead>
                    <TableHead>Coordonnées</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Mots clés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {neighborhoods
                    .filter(n => n.city_id === neighborhoodCityFilter)
                    .sort((a, b) => {
                      const cityA = cities.find(c => c.id === a.city_id)?.name_fr || "";
                      const cityB = cities.find(c => c.id === b.city_id)?.name_fr || "";
                      if (cityA !== cityB) return cityA.localeCompare(cityB, 'fr');
                      return a.name.localeCompare(b.name, 'fr');
                    })
                    .map((n) => {
                      const city = cities.find(c => c.id === n.city_id);
                      return (
                        <TableRow key={n.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {n.image_url ? (
                                <img src={n.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                              <a href={`/neighborhood/${encodeURIComponent(n.name)}${city ? `?city=${encodeURIComponent(city.name_fr)}` : ''}`} target="_blank" rel="noopener noreferrer" title="Voir la page quartier">
                                <Globe className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{n.name}</TableCell>
                          <TableCell className="text-muted-foreground">{city?.name_fr || "—"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-medium">
                              {neighborhoodBusinessCounts[(city?.name_fr || "").toLowerCase() + "|" + n.name.toLowerCase()] || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {n.latitude && n.longitude ? `${n.latitude.toFixed(4)}, ${n.longitude.toFixed(4)}` : "—"}
                          </TableCell>
                          <TableCell>{n.sort_order ?? 0}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                              {n.keywords?.length || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <a href={`/search?q=${encodeURIComponent(n.name + ' ' + (city?.name_fr || ''))}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost" title="Rechercher">
                                <Search className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button size="sm" variant="ghost" onClick={() => openEditNeighborhoodFull(n)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" title="Télécharger les images" onClick={() => fetchNeighborhoodImages(n.name, city?.name_fr || "")}>
                              <Download className="h-4 w-4" />
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

      <Card ref={destinationsSectionRef} style={{ scrollMarginTop: '80px' }}>
        <CardHeader className="cursor-pointer select-none" onClick={() => {
          const opening = !destinationsSectionOpen;
          setDestinationsSectionOpen(opening);
          if (opening) setTimeout(() => destinationsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }}>
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
            <div className="mb-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>« Inclure dans les résultats de recherche »</strong> : lorsque activé, la destination apparaît comme filtre géographique dans la recherche. Les établissements associés à cette destination seront retournés quand un utilisateur recherche son nom (ex : « Palmeraie », « Route de l'Ourika »).
              </p>
              <Select value={destinationRegionFilter} onValueChange={setDestinationRegionFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filtrer par région" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les régions</SelectItem>
                  {[...new Set(destinations.flatMap(d => d.region || []).filter(Boolean))]
                    .sort((a, b) => a.localeCompare(b, 'fr'))
                    .map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {destinations.filter(d => destinationRegionFilter === "all" || (d.region || []).includes(destinationRegionFilter)).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune destination</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Région</TableHead>
                    <TableHead>Villes</TableHead>
                    <TableHead>Search</TableHead>
                    <TableHead>Coordonnées</TableHead>
                    <TableHead>Note /20</TableHead>
                    <TableHead>Établissements</TableHead>
                    <TableHead>Mots clés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destinations.filter(d => destinationRegionFilter === "all" || (d.region || []).includes(destinationRegionFilter)).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {(d as any).images?.[0] ? (
                          <img src={(d as any).images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (d as any).image_url ? (
                          <img src={(d as any).image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{d.name_fr}</TableCell>
                      <TableCell className="text-muted-foreground">{(d.region || []).join(", ") || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(d.city_ids && d.city_ids.length > 0)
                          ? d.city_ids.map(cid => cities.find(c => c.id === cid)?.name_fr || cid).sort((a, b) => a.localeCompare(b, 'fr')).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className={`w-3 h-3 rounded-full ${d.is_searchable ? 'bg-green-500' : 'bg-red-500'}`} title={d.is_searchable ? 'Oui' : 'Non'} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.latitude && d.longitude ? `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.google_rating ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{((d.google_rating / 5) * 20).toFixed(1)}/20</span>
                            {d.google_review_count ? <span className="text-xs text-muted-foreground">{d.google_review_count.toLocaleString('fr-FR')} avis</span> : null}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                            {destinationBusinessCounts[d.id] || 0}
                          </span>
                          {(destinationBusinessCounts[d.id] || 0) > 0 && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Voir les établissements liés"
                              onClick={async () => {
                                const { data } = await supabase
                                  .from("business_destinations" as any)
                                  .select("business_id, businesses!inner(name)")
                                  .eq("destination_id", d.id) as any;
                                const names = (data || []).map((r: any) => r.businesses?.name).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, 'fr'));
                                setDestinationBusinessNames({ destId: d.id, names });
                              }}
                            >
                              <Search className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                          {d.keywords?.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/destination/${encodeURIComponent(d.name_fr)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                            title="Voir la page destination"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button size="sm" variant="ghost" onClick={() => openEditDestination(d)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Télécharger les images" onClick={() => fetchDestinationImages(d.id, d.name_fr)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Dialog listing businesses linked to a destination */}
            <Dialog open={!!destinationBusinessNames} onOpenChange={(open) => { if (!open) setDestinationBusinessNames(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Établissements liés</DialogTitle>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {destinationBusinessNames?.names.length === 0 && <p className="text-muted-foreground text-sm">Aucun établissement</p>}
                  {destinationBusinessNames?.names.map((name, i) => (
                    <p key={i} className="text-sm py-1 border-b last:border-0">{name}</p>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        )}
      </Card>

      {/* ===== POINTS D'INTÉRÊT ===== */}
      <Card ref={poiSectionRef} style={{ scrollMarginTop: '80px' }}>
        <CardHeader className="cursor-pointer select-none" onClick={() => {
          const opening = !poiSectionOpen;
          setPoiSectionOpen(opening);
          if (opening) setTimeout(() => poiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        }}>
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
            <div className="mb-4">
              <Select value={poiCityFilter} onValueChange={setPoiCityFilter}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Filtrer par ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les villes</SelectItem>
                  {cities
                    .filter(c => pois.some(p => p.city_id === c.id))
                    .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {pois.filter(p => poiCityFilter === "all" || p.city_id === poiCityFilter).length === 0 ? (
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
                    <TableHead>Mots clés</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pois.filter(p => poiCityFilter === "all" || p.city_id === poiCityFilter).map((p) => {
                    const city = cities.find(c => c.id === p.city_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          {(p as any).images?.[0] ? (
                            <img src={(p as any).images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (p as any).image_url ? (
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
                        <TableCell>
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                            {(p as any).keywords?.length || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEditPoi(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Télécharger les images" onClick={() => fetchPoiImages(p.id, p.name_fr)}>
                            <Download className="h-4 w-4" />
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
          <div className="container max-w-6xl mx-auto py-6 px-4">
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
              {/* Keywords / Search aliases - top */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Mots-clés / Alias de recherche</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">Variantes d'écriture pour la recherche</p>
                  <div className="flex flex-wrap gap-2 mb-2 max-h-[300px] overflow-y-auto p-2 border rounded-md min-h-[60px]">
                    {poiForm.keywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                        {kw}
                        <button type="button" onClick={() => setPoiForm(prev => ({ ...prev, keywords: prev.keywords.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={poiKeywordInput}
                      onChange={(e) => setPoiKeywordInput(e.target.value)}
                      placeholder="Ajouter un alias…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPoiKeyword();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addPoiKeyword}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Informations */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom (FR) *</Label>
                    <Input value={poiForm.name_fr} onChange={(e) => setPoiForm({ ...poiForm, name_fr: e.target.value })} />
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
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Coordonnées GPS</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Images</CardTitle></CardHeader>
                <CardContent>
                  <ImageUploader
                    images={poiForm.images}
                    onChange={(imgs) => setPoiForm(prev => ({ ...prev, images: imgs }))}
                    maxImages={12}
                    businessId={editingPoi?.id || "poi"}
                  />
                </CardContent>
              </Card>

              {/* Hook */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Hook (H2)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Input
                      value={poiForm.hook}
                      onChange={(e) => setPoiForm({ ...poiForm, hook: e.target.value.slice(0, 120) })}
                      placeholder="Accroche courte pour ce point d'intérêt..."
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground text-right">{poiForm.hook.length}/120</p>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description — {(poiForm.description || "").replace(/<[^>]*>/g, '').length} / 5 000 caractères</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    content={poiForm.description}
                    onChange={(val) => setPoiForm(prev => ({ ...prev, description: val }))}
                  />
                </CardContent>
              </Card>

              {/* Wikipedia — bottom */}
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

              {/* Sites officiels — bottom */}
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

              {/* Note interne */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Note interne — {(poiForm.internal_notes || "").length} / 5 000 caractères</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={poiForm.internal_notes}
                    onChange={(e) => setPoiForm(prev => ({ ...prev, internal_notes: e.target.value.slice(0, 5000) }))}
                    placeholder="Notes internes (non visibles publiquement)..."
                    maxLength={5000}
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
          <div className="container max-w-6xl mx-auto py-6 px-4">
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
              {/* Keywords / Search aliases - moved to top */}
               <Card>
                 <CardHeader><CardTitle className="text-lg">Mots-clés / Alias de recherche</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <p className="text-xs text-muted-foreground">Variantes d'écriture pour la recherche</p>
                    <div className="flex flex-wrap gap-2 mb-2 max-h-[300px] overflow-y-auto p-2 border rounded-md min-h-[60px]">
                     {destinationForm.keywords.map((kw, i) => (
                       <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                         {kw}
                         <button type="button" onClick={() => setDestinationForm({ ...destinationForm, keywords: destinationForm.keywords.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive">
                           <X className="h-3 w-3" />
                         </button>
                       </span>
                     ))}
                   </div>
                    <div className="flex gap-2">
                      <Input
                        ref={destinationKeywordInputRef}
                        placeholder="Ajouter un alias…"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !destinationForm.keywords.includes(val)) {
                              setDestinationForm({ ...destinationForm, keywords: [...destinationForm.keywords, val] });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => {
                        const val = destinationKeywordInputRef.current?.value?.trim();
                        if (val && !destinationForm.keywords.includes(val)) {
                          setDestinationForm({ ...destinationForm, keywords: [...destinationForm.keywords, val] });
                          destinationKeywordInputRef.current!.value = '';
                        }
                      }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                   <div className="flex items-center gap-3 pt-2 border-t">
                     <Switch
                       checked={destinationForm.is_searchable}
                       onCheckedChange={(checked) => setDestinationForm({ ...destinationForm, is_searchable: checked })}
                     />
                     <Label className="text-sm font-medium cursor-pointer" onClick={() => setDestinationForm({ ...destinationForm, is_searchable: !destinationForm.is_searchable })}>
                       Inclure dans les résultats de recherche
                     </Label>
                   </div>
                 </CardContent>
               </Card>

              {/* Informations */}
              <Card>
                <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom (FR) *</Label>
                    <Input value={destinationForm.name_fr} onChange={(e) => setDestinationForm({ ...destinationForm, name_fr: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Régions <span className="text-destructive">*</span></Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {destinationForm.regions.map((r, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                            {r}
                            <button type="button" onClick={() => setDestinationForm(prev => ({ ...prev, regions: prev.regions.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <Select
                        value={undefined}
                        onValueChange={(value) => {
                          if (value && !destinationForm.regions.includes(value)) {
                            setDestinationForm(prev => ({ ...prev, regions: [...prev.regions, value] }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ajouter une région..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRegions.filter(r => !destinationForm.regions.includes(r)).map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Villes</Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {destinationForm.city_ids.map((cid, i) => {
                          const city = cities.find(c => c.id === cid);
                          return (
                            <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                              {city?.name_fr || cid}
                              <button type="button" onClick={() => setDestinationForm(prev => ({ ...prev, city_ids: prev.city_ids.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <Select
                        value={undefined}
                        onValueChange={(value) => {
                          if (value && !destinationForm.city_ids.includes(value)) {
                            setDestinationForm(prev => ({ ...prev, city_ids: [...prev.city_ids, value] }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Ajouter une ville..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.filter(c => c.is_active && !destinationForm.city_ids.includes(c.id)).sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr')).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Coordonnées GPS</Label>
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
                  </div>
                </CardContent>
              </Card>

              {/* Google Maps & Avis */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Map className="h-5 w-5" /> Google Maps & Avis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Google Maps URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Google Maps
                      {destinationForm.google_maps_url && (
                        <a href={destinationForm.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs hover:text-blue-800">↗</a>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={destinationForm.google_maps_url}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDestinationForm(prev => ({ ...prev, google_maps_url: val, google_reviews_url: val || prev.google_reviews_url }));
                        }}
                        placeholder="https://maps.google.com/..."
                        className="flex-1"
                      />
                      {destinationForm.google_maps_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs shrink-0"
                          onClick={async () => {
                            const url = destinationForm.google_maps_url;
                            try {
                              toast({ title: "Résolution de l'URL...", description: "Extraction des coordonnées GPS." });
                              const { data, error } = await supabase.functions.invoke("resolve-maps-url", {
                                body: { url },
                              });
                              if (error) throw error;
                              if (data?.lat && data?.lng) {
                                setDestinationForm(prev => ({
                                  ...prev,
                                  latitude: String(data.lat),
                                  longitude: String(data.lng),
                                  ...(data.resolvedUrl && data.resolvedUrl !== url ? { google_maps_url: data.resolvedUrl, google_reviews_url: data.resolvedUrl } : {}),
                                  ...(data.rating !== undefined ? { google_rating: String(data.rating) } : {}),
                                  ...(data.reviewCount !== undefined ? { google_review_count: String(data.reviewCount) } : {}),
                                }));
                                // Save reviews to destination_reviews table if we have them and a destination ID
                                if (data.reviews && data.reviews.length > 0 && editingDestination?.id) {
                                  // Delete existing reviews first
                                  await supabase.from("destination_reviews" as any).delete().eq("destination_id", editingDestination.id);
                                  const reviewRows = data.reviews.map((r: any) => ({
                                    destination_id: editingDestination.id,
                                    source: "google",
                                    author_name: r.author_name,
                                    rating: r.rating,
                                    text: r.text,
                                    relative_time: r.relative_time,
                                    language: r.language,
                                    published_at: r.published_at,
                                  }));
                                  await supabase.from("destination_reviews" as any).insert(reviewRows);
                                }
                                const parts = [`Lat: ${data.lat}, Lng: ${data.lng}`];
                                if (data.rating !== undefined) parts.push(`Note: ${data.rating}/5`);
                                if (data.reviewCount !== undefined) parts.push(`${data.reviewCount} avis`);
                                if (data.reviews?.length) parts.push(`${data.reviews.length} avis détaillés`);
                                toast({ title: "GPS & avis récupérés", description: parts.join(" · ") });
                              } else {
                                toast({ variant: "destructive", title: "Impossible d'extraire les coordonnées", description: "Le format de l'URL Google Maps n'est pas reconnu." });
                              }
                            } catch (err: any) {
                              toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de résoudre l'URL." });
                            }
                          }}
                        >
                          <LocateFixed className="h-3.5 w-3.5" />
                          Extraire GPS & avis
                        </Button>
                      )}
                      {destinationForm.google_maps_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDestinationForm(prev => ({ ...prev, google_maps_url: "", google_reviews_url: "" }))}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Avis Google */}
                  <div className="p-3 border rounded-lg bg-amber-50 space-y-3">
                    <Label className="text-sm font-semibold">Avis Google</Label>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">URL des avis</Label>
                      <div className="flex gap-2">
                        <Input
                          value={destinationForm.google_reviews_url}
                          onChange={(e) => setDestinationForm(prev => ({ ...prev, google_reviews_url: e.target.value }))}
                          placeholder="URL avis Google"
                          className="text-xs flex-1"
                        />
                        {destinationForm.google_reviews_url && (
                          <a href={destinationForm.google_reviews_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Note /5</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={destinationForm.google_rating}
                          onChange={(e) => setDestinationForm(prev => ({ ...prev, google_rating: e.target.value }))}
                          placeholder=""
                          className="w-24 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nb avis</Label>
                        <Input
                          type="number"
                          min="0"
                          value={destinationForm.google_review_count}
                          onChange={(e) => setDestinationForm(prev => ({ ...prev, google_review_count: e.target.value }))}
                          placeholder=""
                          className="w-24 text-sm"
                        />
                      </div>
                      {destinationForm.google_rating && destinationForm.google_review_count && (
                        <div className="flex items-end pb-1">
                          <span className="text-sm text-amber-700 font-medium">
                            ⭐ {destinationForm.google_rating}/5 ({destinationForm.google_review_count} avis)
                            {" → "}
                            <strong>{((parseFloat(destinationForm.google_rating) / 5) * 20).toFixed(2)}/20</strong>
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Détail des avis */}
                    {editingDestination?.id && (
                      <div className="pt-2 border-t">
                        <DestinationReviewsEditor key={editingDestination.id + "-reviews"} destinationId={editingDestination.id} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Images</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Image principale (image_url) */}
                  {destinationForm.image_url && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Image principale</Label>
                      <div className="relative inline-block">
                        <img
                          src={destinationForm.image_url}
                          alt="Image principale"
                          className="h-28 w-auto rounded-lg border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setDestinationForm(prev => ({ ...prev, image_url: "" }))}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:opacity-80"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-md">{destinationForm.image_url}</p>
                    </div>
                  )}
                  {/* Galerie d'images */}
                  <ImageUploader
                    images={destinationForm.images}
                    onChange={(imgs) => setDestinationForm(prev => ({ ...prev, images: imgs }))}
                    maxImages={30}
                    businessId={editingDestination?.id || "destination"}
                  />
                </CardContent>
              </Card>

              {/* Vidéos – sortable */}
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5" /> Vidéos ({destinationForm.videos.length}/{MAX_DEST_VIDEOS}) — glisser pour réordonner</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <DndContext sensors={destVideoSensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const oldIndex = destinationForm.videos.findIndex((_, i) => `dest-vid-${i}` === active.id);
                    const newIndex = destinationForm.videos.findIndex((_, i) => `dest-vid-${i}` === over.id);
                    if (oldIndex === -1 || newIndex === -1) return;
                    const next = arrayMove(destinationForm.videos, oldIndex, newIndex);
                    setDestinationForm(prev => ({ ...prev, videos: next }));
                  }}>
                    <SortableContext items={destinationForm.videos.map((_, i) => `dest-vid-${i}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {destinationForm.videos.map((url, i) => (
                          <SortableDestVideo
                            key={`dest-vid-${i}`}
                            id={`dest-vid-${i}`}
                            url={url}
                            index={i}
                            onRemove={(idx) => setDestinationForm(prev => ({ ...prev, videos: prev.videos.filter((_, j) => j !== idx) }))}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {destinationForm.videos.length < MAX_DEST_VIDEOS && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://youtube.com/watch?v=... ou URL vidéo"
                        value={destVideoUrlInput}
                        onChange={(e) => setDestVideoUrlInput(e.target.value)}
                        className="flex-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const url = destVideoUrlInput.trim();
                            if (url) {
                              setDestinationForm(prev => ({ ...prev, videos: [...prev.videos, url] }));
                              setDestVideoUrlInput("");
                            }
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => {
                        const url = destVideoUrlInput.trim();
                        if (url) {
                          setDestinationForm(prev => ({ ...prev, videos: [...prev.videos, url] }));
                          setDestVideoUrlInput("");
                        }
                      }} disabled={!destVideoUrlInput.trim()}>
                        <Plus className="h-4 w-4 mr-1" />URL
                      </Button>
                    </div>
                  )}
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
                  <CardTitle className="text-lg">Description — {(destinationForm.description || "").replace(/<[^>]*>/g, '').length} / 5 000 caractères</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    content={destinationForm.description}
                    onChange={(val) => setDestinationForm(prev => ({ ...prev, description: val }))}
                  />
                </CardContent>
              </Card>

              {/* Wikipedia — en bas */}
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

              {/* Note interne */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Note interne — {(destinationForm.internal_notes || "").length} / 5 000 caractères</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={destinationForm.internal_notes}
                    onChange={(e) => setDestinationForm(prev => ({ ...prev, internal_notes: e.target.value.slice(0, 5000) }))}
                    placeholder="Notes internes (non visibles publiquement)..."
                    maxLength={5000}
                  />
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      )}


      {showCityForm && (
        <div className="absolute inset-0 z-50 bg-background overflow-y-auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, minHeight: '100vh' }}>
          <div className="container max-w-6xl mx-auto py-6 px-4 pb-24">
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

                {/* Keywords / Variantes */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    🔤 Mots-clés / Variantes orthographiques
                    {cityForm.keywords.length > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">{cityForm.keywords.length}</span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez les fautes de frappe courantes, translittérations ou noms alternatifs (ex: essauoira, souiria, mogador)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajouter un mot-clé..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                          if (val && !cityForm.keywords.includes(val)) {
                            setCityForm(prev => ({ ...prev, keywords: [...prev.keywords, val] }));
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  {cityForm.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cityForm.keywords.map((kw, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-muted text-foreground text-sm px-2 py-1 rounded-md">
                          {kw}
                          <button
                            type="button"
                            onClick={() => setCityForm(prev => ({ ...prev, keywords: prev.keywords.filter((_, i) => i !== idx) }))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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
                        setCityForm(prev => ({ ...prev, description: value }));
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
        <div ref={neighborhoodFormRef} className="absolute inset-0 z-50 bg-background overflow-y-auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, minHeight: '100vh' }}>
          <div className="container max-w-6xl mx-auto py-6 px-4 pb-24">
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

            <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du quartier <span className="text-destructive">*</span></Label>
                  <Input value={neighborhoodFullForm.name} onChange={(e) => setNeighborhoodFullForm({ ...neighborhoodFullForm, name: e.target.value })} placeholder="Ex: Guéliz" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Keywords / Alias */}
                <div className="space-y-2">
                  <Label>Mots-clés / Alias de recherche</Label>
                  <p className="text-xs text-muted-foreground">Variantes d'écriture pour la recherche (ex: Medina, Ancienne Médina, Old Medina)</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {neighborhoodFullForm.keywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                        {kw}
                        <button type="button" onClick={() => setNeighborhoodFullForm({ ...neighborhoodFullForm, keywords: neighborhoodFullForm.keywords.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                     ref={neighborhoodKeywordInputRef}
                     placeholder="Ajouter un alias…"
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         const val = (e.target as HTMLInputElement).value.trim();
                         if (val && !neighborhoodFullForm.keywords.includes(val)) {
                           setNeighborhoodFullForm({ ...neighborhoodFullForm, keywords: [...neighborhoodFullForm.keywords, val] });
                           (e.target as HTMLInputElement).value = '';
                         }
                       }
                     }}
                   />
                   <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     onClick={() => {
                       const val = neighborhoodKeywordInputRef.current?.value?.trim();
                       if (val && !neighborhoodFullForm.keywords.includes(val)) {
                         setNeighborhoodFullForm({ ...neighborhoodFullForm, keywords: [...neighborhoodFullForm.keywords, val] });
                         neighborhoodKeywordInputRef.current!.value = '';
                       }
                     }}
                   >+</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPS */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LocateFixed className="h-4 w-4" />Coordonnées GPS</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input value={neighborhoodFullForm.latitude} onChange={(e) => setNeighborhoodFullForm({ ...neighborhoodFullForm, latitude: e.target.value })} placeholder="31.6295" />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input value={neighborhoodFullForm.longitude} onChange={(e) => setNeighborhoodFullForm({ ...neighborhoodFullForm, longitude: e.target.value })} placeholder="-7.9811" />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={geocodingField === 'neighborhood'}
                  onClick={async () => {
                    if (!neighborhoodFullForm.name.trim()) return;
                    setGeocodingField('neighborhood');
                    const cityName = cities.find(c => c.id === neighborhoodFullForm.city_id)?.name_fr || '';
                    const result = await handleGeocode(neighborhoodFullForm.name, cityName ? `${cityName}, Maroc` : 'Maroc');
                    if (result) {
                      setNeighborhoodFullForm(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
                      toast({ title: "Géolocalisé", description: `${result.lat}, ${result.lng}` });
                    } else {
                      toast({ variant: "destructive", title: "Erreur", description: "Impossible de géolocaliser." });
                    }
                    setGeocodingField(null);
                  }}
                >
                  {geocodingField === 'neighborhood' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <LocateFixed className="h-4 w-4 mr-1" />}
                  Géolocaliser
                </Button>
              </CardContent>
            </Card>

            {/* Image */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-4 w-4" />Image</CardTitle></CardHeader>
              <CardContent>
                <LogoUploader
                  logoUrl={neighborhoodFullForm.image_url}
                  onChange={(url) => setNeighborhoodFullForm({ ...neighborhoodFullForm, image_url: url })}
                  businessId={editingNeighborhoodFull?.id || "neighborhood"}
                />
              </CardContent>
            </Card>

            {/* Hook */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Hook (H2)
                  <span className="text-sm font-normal text-muted-foreground">
                    ({(neighborhoodFullForm.hook || "").length} / 120)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={neighborhoodFullForm.hook}
                  onChange={(e) => {
                    if (e.target.value.length <= 120) setNeighborhoodFullForm({ ...neighborhoodFullForm, hook: e.target.value });
                  }}
                  placeholder="Accroche courte du quartier..."
                  maxLength={120}
                />
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={neighborhoodFullForm.description}
                  onChange={(value) => setNeighborhoodFullForm(prev => ({ ...prev, description: value }))}
                  placeholder="Description du quartier..."
                />
              </CardContent>
            </Card>
            </div>

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
      {/* Region Full Form Page */}
      {showRegionForm && (
        <div className="absolute inset-0 z-50 bg-background overflow-y-auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, minHeight: '100vh' }}>
          <div className="container max-w-6xl mx-auto py-6 px-4 pb-24">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background py-4 border-b z-10">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => { setEditingRegion(null); setShowRegionForm(false); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {editingRegion ? `Modifier: ${editingRegion.name}` : "Nouvelle région"}
                </h2>
              </div>
              <Button onClick={handleSaveRegion} className="bg-gold hover:bg-gold/90">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom de la région <span className="text-destructive">*</span></Label>
                    <Input
                      value={regionForm.name}
                      onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })}
                      placeholder="Ex : Guelmim-Oued Noun"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ordre d'affichage</Label>
                    <Input
                      type="number"
                      value={regionForm.sort_order}
                      onChange={(e) => setRegionForm({ ...regionForm, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Usage summary */}
              {editingRegion && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Utilisation</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Villes associées :</span>
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-medium">
                        {cities.filter(c => c.region === editingRegion.name).length}
                      </span>
                    </div>
                    {cities.filter(c => c.region === editingRegion.name).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cities.filter(c => c.region === editingRegion.name).map(c => (
                          <span key={c.id} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">{c.name_fr}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Destinations associées :</span>
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-muted text-muted-foreground rounded text-sm font-medium">
                        {destinations.filter(d => (d.region || []).includes(editingRegion.name)).length}
                      </span>
                    </div>
                    {destinations.filter(d => (d.region || []).includes(editingRegion.name)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {destinations.filter(d => (d.region || []).includes(editingRegion.name)).map(d => (
                          <span key={d.id} className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">{d.name_fr}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-6 sticky bottom-0 bg-background py-4 border-t">
              <Button variant="outline" onClick={() => { setEditingRegion(null); setShowRegionForm(false); }}>
                Annuler
              </Button>
              <Button onClick={handleSaveRegion} className="bg-gold hover:bg-gold/90">
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
