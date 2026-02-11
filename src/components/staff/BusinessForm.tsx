import { useState, useEffect, useMemo, useRef } from "react";
import restaurantGuruLogo from "@/assets/restaurant-guru-logo.webp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowDown, Save, Award, Trash2, MapPinned } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import PDFUploader from "./PDFUploader";
import LogoUploader from "./LogoUploader";
import BusinessLabelsEditor from "./BusinessLabelsEditor";
import OpeningHoursEditor, { OpeningHours, DEFAULT_OPENING_HOURS } from "./OpeningHoursEditor";
import VacationDatesEditor, { VacationPeriod } from "./VacationDatesEditor";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedInIcon,
  YouTubeIcon,
  TikTokIcon,
  WhatsAppIcon,
  TripAdvisorIcon,
  BookingIcon,
  GoogleMapsIcon,
  AirbnbIcon,
  PinterestIcon,
  SkypeIcon,
  VimeoIcon,
} from "./SocialMediaIcons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Business = Tables<"businesses">;

interface BusinessFormProps {
  business: Business | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma",
  "L'Oriental",
  "Fès-Meknès",
  "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra",
  "Casablanca-Settat",
  "Marrakech-Safi",
  "Drâa-Tafilalet",
  "Souss-Massa",
  "Guelmim-Oued Noun",
  "Laâyoune-Sakia El Hamra",
  "Dakhla-Oued Ed-Dahab",
];

const CATEGORIES = [
  "Hôtellerie",
  "Restauration",
  "Transport",
  "Artisanat",
  "Commerce",
  "Services",
  "Tourisme",
  "Agriculture",
  "Industrie",
  "Éducation",
  "Santé",
  "Sport & Loisirs",
  "Bien-être",
  "Culture",
  "Technologie",
];

// Subcategories and services are now fetched from the database

const SERVICES: Record<string, string[]> = {
  "Hôtellerie": [
    "WiFi",
    "Piscine",
    "Spa",
    "Restaurant",
    "Bar",
    "Room service",
    "Parking",
    "Climatisation",
    "Petit-déjeuner inclus",
    "Transfert aéroport",
    "Conciergerie",
    "Salle de sport",
    "Terrasse",
    "Vue mer",
    "Vue montagne",
  ],
  "Restauration": [
    "Terrasse",
    "Climatisation",
    "WiFi",
    "Livraison",
    "À emporter",
    "Réservation",
    "Parking",
    "Menu végétarien",
    "Menu halal",
    "Carte des vins",
    "Musique live",
    "Espace fumeur",
  ],
  "Transport": [
    "Climatisation",
    "GPS",
    "Siège bébé",
    "Assurance incluse",
    "Chauffeur",
    "24h/24",
    "Réservation en ligne",
    "Paiement carte",
    "Multilingue",
  ],
  "Artisanat": [
    "Fabrication sur mesure",
    "Livraison",
    "Atelier visitable",
    "Démonstration",
    "Cours/Initiation",
    "Certificat d'authenticité",
    "Export",
  ],
  "Commerce": [
    "Paiement carte",
    "Livraison",
    "Click & Collect",
    "Parking",
    "Climatisation",
    "Service client",
    "Retours acceptés",
  ],
  "Services": [
    "Devis gratuit",
    "Sur rendez-vous",
    "À domicile",
    "En ligne",
    "Multilingue",
    "24h/24",
    "Urgence",
  ],
  "Tourisme": [
    "Guide multilingue",
    "Transport inclus",
    "Repas inclus",
    "Équipement fourni",
    "Assurance incluse",
    "Photos/Vidéos",
    "Petit groupe",
    "Sur mesure",
  ],
  "Agriculture": [
    "Bio",
    "Commerce équitable",
    "Visite de ferme",
    "Vente directe",
    "Livraison",
    "Export",
    "Dégustation",
  ],
  "Industrie": [
    "Certifié ISO",
    "Export",
    "Sur mesure",
    "Livraison",
    "SAV",
    "Formation",
  ],
  "Éducation": [
    "Certificat",
    "En ligne",
    "Présentiel",
    "Tous niveaux",
    "Cours particuliers",
    "Cours collectifs",
    "Stage intensif",
    "Matériel fourni",
  ],
  "Santé": [
    "Rendez-vous en ligne",
    "Urgences",
    "Tiers payant",
    "Parking",
    "Accès PMR",
    "Multilingue",
    "Téléconsultation",
  ],
  "Sport & Loisirs": [
    "Cours débutant",
    "Cours avancé",
    "Location matériel",
    "Encadrement certifié",
    "Vestiaires",
    "Douches",
    "Cours particuliers",
    "Cours collectifs",
    "Stage",
    "Enfants acceptés",
  ],
  "Bien-être": [
    "Sur rendez-vous",
    "Sans rendez-vous",
    "Produits bio",
    "Forfaits",
    "Carte de fidélité",
    "Couples",
    "Privatisation",
    "Vestiaires",
  ],
  "Culture": [
    "Visite guidée",
    "Audioguide",
    "Boutique",
    "Café",
    "Accès PMR",
    "Groupes",
    "Scolaires",
    "Événements privés",
  ],
  "Technologie": [
    "Devis gratuit",
    "Support 24/7",
    "Formation",
    "Maintenance",
    "Hébergement",
    "SEO",
    "E-commerce",
    "Application mobile",
  ],
};

const BusinessForm = ({ business, onSuccess, onCancel }: BusinessFormProps) => {
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showClearSocial, setShowClearSocial] = useState(false);
  const [showClearBooking, setShowClearBooking] = useState(false);
  const [showClearReviews, setShowClearReviews] = useState(false);
  const { toast } = useToast();
  
  // Dynamic subcategories and services from database
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [dbSubcategories, setDbSubcategories] = useState<Array<{ id: string; name_fr: string; category_id: string }>>([]);
  const [dbServices, setDbServices] = useState<Array<{ id: string; name_fr: string; subcategory_id: string }>>([]);
  const [dbCities, setDbCities] = useState<Array<{ id: string; name_fr: string; region: string | null }>>([]);
  const [dbGammes, setDbGammes] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [gammeCategories, setGammeCategories] = useState<Array<{ gamme_id: string; category_id: string }>>([]);
  const [dbNeighborhoods, setDbNeighborhoods] = useState<Array<{ id: string; name: string; city_id: string }>>([]);

  // Fetch categories, subcategories, services, cities, gammes and gamme_categories from database
  useEffect(() => {
    const fetchTaxonomy = async () => {
      const [catRes, subRes, servRes, citiesRes, gammesRes, gammeCatRes, neighborhoodsRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        supabase.from("services").select("id, name_fr, subcategory_id").order("sort_order"),
        supabase.from("cities").select("id, name_fr, region").order("name_fr"),
        supabase.from("gammes").select("id, name_fr").order("sort_order"),
        supabase.from("gamme_categories").select("gamme_id, category_id"),
        supabase.from("neighborhoods").select("id, name, city_id").order("name"),
      ]);
      
      if (catRes.data) setDbCategories(catRes.data);
      if (subRes.data) setDbSubcategories(subRes.data);
      if (servRes.data) setDbServices(servRes.data);
      if (citiesRes.data) setDbCities(citiesRes.data);
      if (gammesRes.data) setDbGammes(gammesRes.data);
      if (gammeCatRes.data) setGammeCategories(gammeCatRes.data);
      if (neighborhoodsRes.data) setDbNeighborhoods(neighborhoodsRes.data);
    };
    
    fetchTaxonomy();
  }, []);

  const [formData, setFormData] = useState({
    name: business?.name || "",
    description: business?.description || "",
    address: business?.address || "",
    city: business?.city || "",
    region: business?.region || "",
    country: business?.country || "Maroc",
    phone: business?.phone || "",
    email: business?.email || "",
    website: business?.website || "",
    main_category: business?.main_category || "",
    categories: business?.categories || [] as string[],
    services: business?.services || [] as string[],
    keywords: business?.keywords?.join(", ") || "",
    latitude: business?.latitude?.toString() || "",
    longitude: business?.longitude?.toString() || "",
    wtuce_status: business?.wtuce_status || "pending",
    is_featured: business?.is_featured || false,
    is_active: (business as any)?.is_active ?? true,
    priority_score: business?.priority_score?.toString() || "0",
    logo_url: business?.logo_url || "",
    
    ice: (business as any)?.ice || "",
    kp_regroupement: (business as any)?.kp_regroupement || "",
    facebook_url: (business as any)?.facebook_url || "",
    instagram_url: (business as any)?.instagram_url || "",
    twitter_url: (business as any)?.twitter_url || "",
    linkedin_url: (business as any)?.linkedin_url || "",
    youtube_url: (business as any)?.youtube_url || "",
    tiktok_url: (business as any)?.tiktok_url || "",
    whatsapp: (business as any)?.whatsapp || "",
    tripadvisor_url: (business as any)?.tripadvisor_url || "",
    booking_url: (business as any)?.booking_url || "",
    account_type: (business as any)?.account_type || "",
    internal_notes: (business as any)?.internal_notes || "",
    video_1_url: (business as any)?.video_1_url || "",
    google_maps_url: (business as any)?.google_maps_url || "",
    airbnb_url: (business as any)?.airbnb_url || "",
    pinterest_url: (business as any)?.pinterest_url || "",
    skype: (business as any)?.skype || "",
    vimeo_url: (business as any)?.vimeo_url || "",
    images: (business as any)?.images || [] as string[],
    pdf_url: (business as any)?.pdf_url || "",
    online_shop_url: (business as any)?.online_shop_url || "",
    opening_hours: (business as any)?.opening_hours as OpeningHours | null,
    rating: (business as any)?.rating?.toString() || "",
    reserve_now_url: (business as any)?.reserve_now_url || "",
    show_opening_hours: (business as any)?.show_opening_hours ?? false,
    is_open_24h: (business as any)?.is_open_24h ?? false,
    vacation_dates: ((business as any)?.vacation_dates || []) as VacationPeriod[],
    hotels_com_url: (business as any)?.hotels_com_url || "",
    trivago_url: (business as any)?.trivago_url || "",
    tripadvisor_review_url: (business as any)?.tripadvisor_review_url || "",
    tripadvisor_rating: (business as any)?.tripadvisor_rating ?? "",
    tripadvisor_review_count: (business as any)?.tripadvisor_review_count ?? "",
    restaurant_guru_url: (business as any)?.restaurant_guru_url || "",
    restaurant_guru_rating: (business as any)?.restaurant_guru_rating ?? "",
    restaurant_guru_review_count: (business as any)?.restaurant_guru_review_count ?? "",
    google_reviews_url: (business as any)?.google_reviews_url || "",
    google_rating: (business as any)?.google_rating ?? "",
    google_review_count: (business as any)?.google_review_count ?? "",
    other_booking_url: (business as any)?.other_booking_url || "",
    other_booking_name: (business as any)?.other_booking_name || "",
    gamme_id: (business as any)?.gamme_id || "",
    neighborhood: (business as any)?.neighborhood || "",
    hook_fr: (business as any)?.hook_fr || "",
    hook_en: (business as any)?.hook_en || "",
    hook_ar: (business as any)?.hook_ar || "",
    menu_url: (business as any)?.menu_url || "",
  });
  
  // Business labels state (managed separately)
  const [businessLabels, setBusinessLabels] = useState<Array<{ id?: string; label_id: string; custom_url: string }>>([]);

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => {
      const currentCategories = prev.categories;
      if (currentCategories.includes(category)) {
        return { ...prev, categories: currentCategories.filter((c) => c !== category) };
      } else {
        return { ...prev, categories: [...currentCategories, category] };
      }
    });
  };

  const handleServiceToggle = (service: string) => {
    setFormData((prev) => {
      const currentServices = prev.services;
      if (currentServices.includes(service)) {
        return { ...prev, services: currentServices.filter((s) => s !== service) };
      } else {
        return { ...prev, services: [...currentServices, service] };
      }
    });
  };

  // Find the category ID for the selected main_category
  const selectedCategory = useMemo(() => 
    dbCategories.find(c => c.name_fr === formData.main_category),
    [dbCategories, formData.main_category]
  );
  
  // Get subcategories for selected category from database (sorted alphabetically)
  const availableSubcategories = useMemo(() => 
    selectedCategory
      ? dbSubcategories
          .filter(sub => sub.category_id === selectedCategory.id)
          .map(sub => sub.name_fr)
          .sort((a, b) => a.localeCompare(b, 'fr'))
      : [],
    [selectedCategory, dbSubcategories]
  );

  // Get services for ALL selected subcategories from database (sorted alphabetically)
  // This includes subcategories from any category, not just the current main category
  const selectedSubcategoryIds = useMemo(() => 
    dbSubcategories
      .filter(sub => formData.categories.includes(sub.name_fr))
      .map(sub => sub.id),
    [dbSubcategories, formData.categories]
  );
  
  const availableServices = useMemo(() => 
    selectedSubcategoryIds.length > 0
      ? dbServices
          .filter(srv => selectedSubcategoryIds.includes(srv.subcategory_id))
          .map(srv => srv.name_fr)
          .sort((a, b) => a.localeCompare(b, 'fr'))
      : [],
    [dbServices, selectedSubcategoryIds]
  );

  // Get gammes available for the selected main category
  const availableGammes = useMemo(() => {
    if (!selectedCategory) return [];
    const gammeIdsForCategory = gammeCategories
      .filter((gc) => gc.category_id === selectedCategory.id)
      .map((gc) => gc.gamme_id);
    return dbGammes
      .filter((g) => gammeIdsForCategory.includes(g.id))
      .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'));
  }, [selectedCategory, gammeCategories, dbGammes]);

  // Get neighborhoods for the selected city
  const neighborhoodsForCity = useMemo(() => {
    if (!formData.city) return [];
    const selectedCity = dbCities.find(c => c.name_fr === formData.city);
    if (!selectedCity) return [];
    return dbNeighborhoods.filter(n => n.city_id === selectedCity.id);
  }, [formData.city, dbCities, dbNeighborhoods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const businessData = {
      name: formData.name,
      description: formData.description || null,
      address: formData.address || null,
      city: formData.city,
      region: formData.region,
      country: formData.country,
      phone: formData.phone || null,
      email: formData.email || null,
      website: formData.website || null,
      main_category: formData.main_category || null,
      categories: formData.categories.length > 0 ? formData.categories : [],
      services: formData.services.length > 0 ? formData.services : [],
      keywords: formData.keywords ? formData.keywords.split(",").map((k) => k.trim()) : [],
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      wtuce_status: formData.wtuce_status as "verified" | "pending",
      is_featured: formData.is_featured,
      is_active: formData.is_active,
      priority_score: parseInt(formData.priority_score) || 0,
      logo_url: formData.logo_url || null,
      
      ice: formData.ice || null,
      kp_regroupement: formData.kp_regroupement || null,
      facebook_url: formData.facebook_url || null,
      instagram_url: formData.instagram_url || null,
      twitter_url: formData.twitter_url || null,
      linkedin_url: formData.linkedin_url || null,
      youtube_url: formData.youtube_url || null,
      tiktok_url: formData.tiktok_url || null,
      whatsapp: formData.whatsapp || null,
      tripadvisor_url: formData.tripadvisor_url || null,
      booking_url: formData.booking_url || null,
      account_type: formData.account_type || null,
      internal_notes: formData.internal_notes ? formData.internal_notes.slice(0, 5000) : null,
      video_1_url: formData.video_1_url || null,
      google_maps_url: formData.google_maps_url || null,
      airbnb_url: formData.airbnb_url || null,
      pinterest_url: formData.pinterest_url || null,
      skype: formData.skype || null,
      vimeo_url: formData.vimeo_url || null,
      images: formData.images.length > 0 ? formData.images : [],
      pdf_url: formData.pdf_url || null,
      online_shop_url: formData.online_shop_url || null,
      opening_hours: formData.opening_hours ? JSON.parse(JSON.stringify(formData.opening_hours)) : null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      reserve_now_url: formData.reserve_now_url || null,
      show_opening_hours: formData.show_opening_hours,
      is_open_24h: formData.is_open_24h,
      vacation_dates: formData.vacation_dates.length > 0 ? JSON.parse(JSON.stringify(formData.vacation_dates)) : [],
      hotels_com_url: formData.hotels_com_url || null,
      trivago_url: formData.trivago_url || null,
      tripadvisor_review_url: (formData as any).tripadvisor_review_url || null,
      tripadvisor_rating: (formData as any).tripadvisor_rating !== "" ? parseFloat((formData as any).tripadvisor_rating) : null,
      tripadvisor_review_count: (formData as any).tripadvisor_review_count !== "" ? parseInt((formData as any).tripadvisor_review_count) : null,
      restaurant_guru_url: (formData as any).restaurant_guru_url || null,
      restaurant_guru_rating: (formData as any).restaurant_guru_rating !== "" ? parseFloat((formData as any).restaurant_guru_rating) : null,
      restaurant_guru_review_count: (formData as any).restaurant_guru_review_count !== "" ? parseInt((formData as any).restaurant_guru_review_count) : null,
      google_reviews_url: (formData as any).google_reviews_url || null,
      google_rating: (formData as any).google_rating !== "" ? parseFloat((formData as any).google_rating) : null,
      google_review_count: (formData as any).google_review_count !== "" ? parseInt((formData as any).google_review_count) : null,
      other_booking_url: formData.other_booking_url || null,
      other_booking_name: formData.other_booking_name || null,
      gamme_id: formData.gamme_id || null,
      neighborhood: formData.neighborhood || null,
      hook_fr: formData.hook_fr || null,
      hook_en: formData.hook_en || null,
      hook_ar: formData.hook_ar || null,
      menu_url: formData.menu_url || null,
    };

    try {
      let businessId = business?.id;
      
      if (business) {
        // Update
        const { error } = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", business.id);

        if (error) throw error;
      } else {
        // Create
        const { data: newBusiness, error } = await supabase
          .from("businesses")
          .insert(businessData)
          .select("id")
          .single();

        if (error) throw error;
        businessId = newBusiness?.id;
      }

      // Save business labels
      if (businessId) {
        // Delete existing labels
        await supabase
          .from("business_labels" as any)
          .delete()
          .eq("business_id", businessId);
        
        // Insert new labels
        if (businessLabels.length > 0) {
          const labelsToInsert = businessLabels.map((bl, index) => ({
            business_id: businessId,
            label_id: bl.label_id,
            custom_url: bl.custom_url || null,
            sort_order: index,
          }));
          
          const { error: labelsError } = await supabase
            .from("business_labels" as any)
            .insert(labelsToInsert);
          
          if (labelsError) {
            console.error("Error saving labels:", labelsError);
          }
        }
      }

      toast({
        title: "Succès",
        description: business ? "Entreprise mise à jour avec succès." : "Entreprise créée avec succès.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg border p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => isDirty ? setShowLeaveDialog(true) : onCancel()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h2 className="text-xl font-bold">
            {business ? "Modifier l'entreprise" : "Nouvelle entreprise"}
          </h2>
        </div>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          disabled={loading}
          className="bg-gold hover:bg-gold/90 text-gold-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nom + Logo */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-xl font-semibold">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              className="!text-4xl font-bold h-20 px-4"
              style={{ fontSize: '2.25rem', lineHeight: '2.5rem' }}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-base font-semibold">Logo</Label>
            <LogoUploader
              logoUrl={formData.logo_url}
              onChange={(url) => handleChange("logo_url", url)}
              businessId={business?.id}
            />
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label htmlFor="ice">ICE (max 20 caractères)</Label>
            <Input
              id="ice"
              value={formData.ice}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                handleChange("ice", value);
              }}
              placeholder="ABC123..."
              maxLength={20}
              pattern="[a-zA-Z0-9]*"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kp_regroupement">KP regroupement (max 20 caractères)</Label>
            <Input
              id="kp_regroupement"
              value={formData.kp_regroupement}
              onChange={(e) => {
                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
                handleChange("kp_regroupement", value);
              }}
              placeholder="ABC123..."
              maxLength={20}
              pattern="[a-zA-Z0-9]*"
            />
          </div>
        </div>

        {/* Note /20, Statut, Mise en avant, Priority Score */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="space-y-2">
            <Label htmlFor="rating" className="font-semibold text-blue-800 dark:text-blue-200">Note /20</Label>
            <Input
              id="rating"
              type="number"
              step="0.01"
              min="0"
              max="20"
              value={formData.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              placeholder="0 - 20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wtuce_status" className="font-semibold text-blue-800 dark:text-blue-200">Statut WTUCE</Label>
            <Select
              value={formData.wtuce_status}
              onValueChange={(value) => handleChange("wtuce_status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="verified">Vérifié ✓</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority_score" className="font-semibold text-blue-800 dark:text-blue-200">Priority Score</Label>
            <Input
              id="priority_score"
              type="number"
              min="0"
              value={formData.priority_score}
              onChange={(e) => handleChange("priority_score", e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="is_featured"
              checked={formData.is_featured}
              onChange={(e) => handleChange("is_featured", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_featured" className="font-semibold text-blue-800 dark:text-blue-200">Mise en avant</Label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="font-semibold text-blue-800 dark:text-blue-200">Actif</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="main_category">Catégorie principale</Label>
            <Select
              value={formData.main_category}
              onValueChange={(value) => {
                handleChange("main_category", value);
                // Reset gamme_id when category changes
                handleChange("gamme_id", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {dbCategories
                  .slice()
                  .sort((a, b) => a.name_fr.localeCompare(b.name_fr, 'fr'))
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.name_fr}>
                      {cat.name_fr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gamme_id">Gamme</Label>
            <Select
              value={formData.gamme_id}
              onValueChange={(value) => handleChange("gamme_id", value)}
              disabled={availableGammes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.main_category 
                    ? "Choisir une catégorie d'abord" 
                    : availableGammes.length === 0 
                      ? "Aucune gamme disponible" 
                      : "Sélectionner..."
                } />
              </SelectTrigger>
              <SelectContent>
                {availableGammes.map((gamme) => (
                  <SelectItem key={gamme.id} value={gamme.id}>
                    {gamme.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Type de compte</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => handleChange("account_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="petite_structure">Petite Structure</SelectItem>
                <SelectItem value="structure_moyenne">Structure Moyenne</SelectItem>
                <SelectItem value="grande_structure">Grande Structure</SelectItem>
                <SelectItem value="corporate_branding">Corporate & Branding</SelectItem>
                <SelectItem value="institution">Institution</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact & Localisation */}
        <div className="p-4 border rounded-lg bg-orange-50 space-y-4">
          <h3 className="text-sm font-semibold text-orange-800">📍 Contact & Localisation</h3>
          
          {/* Adresse, Ville, Région, Quartier */}
          <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
            <div className="space-y-2 md:col-span-4">
              <Label htmlFor="address_top">Adresse</Label>
              <Input
                id="address_top"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="city_top">Ville *</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => {
                  handleChange("city", value);
                  const selectedCity = dbCities.find(c => c.name_fr === value);
                  if (selectedCity?.region) {
                    handleChange("region", selectedCity.region);
                  }
                  handleChange("neighborhood", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ville..." />
                </SelectTrigger>
                <SelectContent>
                  {dbCities.map((city) => (
                    <SelectItem key={city.id} value={city.name_fr}>
                      {city.name_fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="region_top">Région *</Label>
              <Select
                value={formData.region}
                onValueChange={(value) => handleChange("region", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Région..." />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="neighborhood_top">Quartier</Label>
              <Select
                value={formData.neighborhood}
                onValueChange={(value) => handleChange("neighborhood", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !formData.city
                      ? "Ville d'abord"
                      : neighborhoodsForCity.length === 0
                        ? "Aucun"
                        : "Quartier..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {neighborhoodsForCity.map((n) => (
                    <SelectItem key={n.id} value={n.name}>
                      {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps_url_top" className="flex items-center gap-2">
              <GoogleMapsIcon className="text-[#4285F4]" />
              {formData.google_maps_url ? (
                <a href={formData.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                  Google Maps ↗
                </a>
              ) : (
                "Google Maps"
              )}
            </Label>
            <Input
              id="google_maps_url_top"
              value={formData.google_maps_url}
              onChange={(e) => {
                const val = e.target.value;
                handleChange("google_maps_url", val);
                if (val) {
                  handleChange("google_reviews_url", val);
                }
              }}
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Latitude, Longitude & GPS button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="latitude_top" className="text-xs">Latitude</Label>
              <Input
                id="latitude_top"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleChange("latitude", e.target.value)}
                placeholder="31.6295"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude_top" className="text-xs">Longitude</Label>
              <Input
                id="longitude_top"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleChange("longitude", e.target.value)}
                placeholder="-7.9811"
                className="text-xs h-8"
              />
            </div>
            {formData.google_maps_url && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-xs h-8"
                onClick={async () => {
                  const url = formData.google_maps_url;
                  const tryExtract = (u: string) => {
                    const atMatch = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                    if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
                    const qMatch = u.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
                                   u.match(/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                    if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
                    const embedMatch = u.match(/!3d(-?\d+\.?\d*).*!4d(-?\d+\.?\d*)/);
                    if (embedMatch) return { lat: embedMatch[1], lng: embedMatch[2] };
                    return null;
                  };
                  const local = tryExtract(url);
                  if (local) {
                    handleChange("latitude", local.lat);
                    handleChange("longitude", local.lng);
                    toast({ title: "GPS récupéré", description: `Lat: ${local.lat}, Lng: ${local.lng}` });
                    return;
                  }
                  try {
                    toast({ title: "Résolution de l'URL...", description: "Veuillez patienter." });
                    const { data, error } = await supabase.functions.invoke("resolve-maps-url", {
                      body: { url },
                    });
                    if (error) throw error;
                    if (data?.lat && data?.lng) {
                      handleChange("latitude", data.lat);
                      handleChange("longitude", data.lng);
                      if (data.resolvedUrl) {
                        handleChange("google_maps_url", data.resolvedUrl);
                      }
                      toast({ title: "GPS récupéré", description: `Lat: ${data.lat}, Lng: ${data.lng}` });
                    } else {
                      toast({ variant: "destructive", title: "Impossible d'extraire les coordonnées", description: "Le format de l'URL Google Maps n'est pas reconnu." });
                    }
                  } catch (err: any) {
                    toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de résoudre l'URL." });
                  }
                }}
              >
                <MapPinned className="h-3.5 w-3.5" />
                Récupérer GPS depuis Google Maps
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_top" className="flex items-center gap-2">
                <WhatsAppIcon className="text-[#25D366]" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp_top"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder="+212 6XX-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_top">Téléphone</Label>
              <Input
                id="phone_top"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+212 5XX-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_top">Email</Label>
              <Input
                id="email_top"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skype_top" className="flex items-center gap-2">
                <SkypeIcon className="text-[#00AFF0]" />
                Skype
              </Label>
              <Input
                id="skype_top"
                value={formData.skype}
                onChange={(e) => handleChange("skype", e.target.value)}
                placeholder="identifiant.skype"
              />
            </div>
          </div>
          <div className="space-y-2">
            {formData.website ? (
              <Label htmlFor="website_top"><a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Site web ↗</a></Label>
            ) : (
              <Label htmlFor="website_top">Site web</Label>
            )}
            <Input
              id="website_top"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://"
            />
            {formData.website && (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1 transition-colors mt-1"
                title="Copier l'URL du site web vers Réserver maintenant"
                onClick={() => {
                  handleChange("reserve_now_url", formData.website);
                  toast({ title: "URL copiée vers \"Réserver maintenant\"" });
                }}
              >
                <ArrowDown className="h-4 w-4" />
                <span>↓ Copier vers Réserver maintenant</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {formData.reserve_now_url ? (
              <Label htmlFor="reserve_now_url_top"><a href={formData.reserve_now_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Lien "Réserver maintenant" ↗</a></Label>
            ) : (
              <Label htmlFor="reserve_now_url_top">Lien "Réserver maintenant"</Label>
            )}
            <Input
              id="reserve_now_url_top"
              value={formData.reserve_now_url}
              onChange={(e) => handleChange("reserve_now_url", e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-2">
            {formData.online_shop_url ? (
              <Label htmlFor="online_shop_url_top"><a href={formData.online_shop_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Boutique en ligne ↗</a></Label>
            ) : (
              <Label htmlFor="online_shop_url_top">Boutique en ligne</Label>
            )}
            <Input
              id="online_shop_url_top"
              value={formData.online_shop_url}
              onChange={(e) => handleChange("online_shop_url", e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>

        {/* Hook multilingue - affiché en gros comme Nom */}
        <div className="space-y-3">
          <Input
            id="hook_fr"
            value={formData.hook_fr}
            onChange={(e) => handleChange("hook_fr", e.target.value.slice(0, 120))}
            placeholder="Accroche en français"
            maxLength={120}
            className="!text-2xl font-semibold h-14 px-4"
            style={{ fontSize: '1.5rem', lineHeight: '2rem' }}
          />
          <span className="text-xs text-muted-foreground">{formData.hook_fr.length}/120</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            content={formData.description}
            onChange={(html) => handleChange("description", html)}
            maxHeight="600px"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="menu_url">Menu (URL)</Label>
          <Input
            id="menu_url"
            value={formData.menu_url}
            onChange={(e) => handleChange("menu_url", e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Video */}
        <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Label className="text-base font-semibold">Vidéo</Label>
          <div className="space-y-2">
            <Label htmlFor="video_1_url">URL Vidéo 1 (YouTube, Vimeo, ou lien direct)</Label>
            <Input
              id="video_1_url"
              value={formData.video_1_url}
              onChange={(e) => handleChange("video_1_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
            />
          </div>
          {formData.video_1_url && (
            <div className="space-y-2">
              <Label>Prévisualisation</Label>
              <div className="aspect-video w-full max-w-2xl rounded-lg overflow-hidden border bg-muted">
                {formData.video_1_url.includes('youtube.com') || formData.video_1_url.includes('youtu.be') ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${
                      formData.video_1_url.includes('youtu.be') 
                        ? formData.video_1_url.split('youtu.be/')[1]?.split('?')[0]
                        : formData.video_1_url.split('v=')[1]?.split('&')[0]
                    }`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : formData.video_1_url.includes('vimeo.com') ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${formData.video_1_url.split('vimeo.com/')[1]?.split('?')[0]}`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={formData.video_1_url}
                    controls
                    className="w-full h-full object-contain"
                  >
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Images (max 12)</Label>
          <ImageUploader
            images={formData.images}
            onChange={(images) => handleChange("images", images)}
            maxImages={12}
            businessId={business?.id}
          />
        </div>

        {/* PDF Document */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Document PDF</Label>
          <PDFUploader
            pdfUrl={formData.pdf_url}
            onChange={(url) => handleChange("pdf_url", url)}
            businessId={business?.id}
          />
        </div>

        {/* Labels */}
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Award className="h-4 w-4" />
            Labels / Certifications
          </Label>
          <BusinessLabelsEditor
            businessId={business?.id}
            value={businessLabels}
            onChange={setBusinessLabels}
          />
          </div>


        {/* Social Media */}
        <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Label className="text-xl font-semibold">Réseaux sociaux</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook_url" className="flex items-center gap-2">
                <FacebookIcon className="text-[#1877F2]" />
                {formData.facebook_url ? <a href={formData.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Facebook ↗</a> : "Facebook"}
              </Label>
              <Input id="facebook_url" value={formData.facebook_url} onChange={(e) => handleChange("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_url" className="flex items-center gap-2">
                <InstagramIcon className="text-[#E4405F]" />
                {formData.instagram_url ? <a href={formData.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Instagram ↗</a> : "Instagram"}
              </Label>
              <Input id="instagram_url" value={formData.instagram_url} onChange={(e) => handleChange("instagram_url", e.target.value)} placeholder="https://instagram.com/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_url" className="flex items-center gap-2">
                <TwitterIcon className="text-foreground" />
                {formData.twitter_url ? <a href={formData.twitter_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">X (Twitter) ↗</a> : "X (Twitter)"}
              </Label>
              <Input id="twitter_url" value={formData.twitter_url} onChange={(e) => handleChange("twitter_url", e.target.value)} placeholder="https://x.com/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                <LinkedInIcon className="text-[#0A66C2]" />
                {formData.linkedin_url ? <a href={formData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">LinkedIn ↗</a> : "LinkedIn"}
              </Label>
              <Input id="linkedin_url" value={formData.linkedin_url} onChange={(e) => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/company/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube_url" className="flex items-center gap-2">
                <YouTubeIcon className="text-[#FF0000]" />
                {formData.youtube_url ? <a href={formData.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">YouTube ↗</a> : "YouTube"}
              </Label>
              <Input id="youtube_url" value={formData.youtube_url} onChange={(e) => handleChange("youtube_url", e.target.value)} placeholder="https://youtube.com/@..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                <TikTokIcon className="text-foreground" />
                {formData.tiktok_url ? <a href={formData.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">TikTok ↗</a> : "TikTok"}
              </Label>
              <Input id="tiktok_url" value={formData.tiktok_url} onChange={(e) => handleChange("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@..." />
            </div>


            <div className="space-y-2">
              <Label htmlFor="pinterest_url" className="flex items-center gap-2">
                <PinterestIcon className="text-[#E60023]" />
                {formData.pinterest_url ? <a href={formData.pinterest_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Pinterest ↗</a> : "Pinterest"}
              </Label>
              <Input id="pinterest_url" value={formData.pinterest_url} onChange={(e) => handleChange("pinterest_url", e.target.value)} placeholder="https://pinterest.com/..." />
            </div>


            <div className="space-y-2">
              <Label htmlFor="vimeo_url" className="flex items-center gap-2">
                <VimeoIcon className="text-[#1AB7EA]" />
                {formData.vimeo_url ? <a href={formData.vimeo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Vimeo ↗</a> : "Vimeo"}
              </Label>
              <Input id="vimeo_url" value={formData.vimeo_url} onChange={(e) => handleChange("vimeo_url", e.target.value)} placeholder="https://vimeo.com/..." />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setShowClearSocial(true)}>🗑️ Effacer tous les réseaux sociaux</Button>
        </div>

        {/* Plateformes de réservation */}
        <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Label className="text-xl font-semibold">Plateformes de réservation</Label>
          
          {/* Bouton Réserver maintenant */}
          <div className="space-y-2 p-3 border border-red-200 rounded-lg bg-red-50">
            <Label htmlFor="reserve_now_url" className="flex items-center gap-2 font-medium">
              🔗 Lien du bouton "Réserver maintenant"
            </Label>
            <Input
              id="reserve_now_url"
              value={formData.reserve_now_url}
              onChange={(e) => handleChange("reserve_now_url", e.target.value)}
              placeholder="https://... (lien direct de réservation)"
            />
            <p className="text-xs text-muted-foreground">
              Ce lien sera utilisé pour le bouton CTA "Réserver maintenant" sur la fiche publique
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookingIcon className="text-[#003580]" />
              {formData.booking_url ? <a href={formData.booking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Booking.com ↗</a> : <span className="text-sm font-medium">Booking.com</span>}
              <Input id="booking_url" value={formData.booking_url} onChange={(e) => handleChange("booking_url", e.target.value)} placeholder="https://booking.com/hotel/..." className="flex-1" />
            </div>

            <div className="flex items-center gap-2">
              <TripAdvisorIcon className="text-[#00AF87]" />
              {formData.tripadvisor_url ? <a href={formData.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">TripAdvisor ↗</a> : <span className="text-sm font-medium">TripAdvisor</span>}
              <Input id="tripadvisor_url" value={formData.tripadvisor_url} onChange={(e) => handleChange("tripadvisor_url", e.target.value)} placeholder="https://tripadvisor.com/..." className="flex-1" />
            </div>

            <div className="flex items-center gap-2">
              <AirbnbIcon className="text-[#FF5A5F]" />
              {formData.airbnb_url ? <a href={formData.airbnb_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Airbnb ↗</a> : <span className="text-sm font-medium">Airbnb</span>}
              <Input id="airbnb_url" value={formData.airbnb_url} onChange={(e) => handleChange("airbnb_url", e.target.value)} placeholder="https://airbnb.com/rooms/..." className="flex-1" />
            </div>

            <div className="flex items-center gap-2">
              <span>🏨</span>
              {formData.hotels_com_url ? <a href={formData.hotels_com_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Hotels.com ↗</a> : <span className="text-sm font-medium">Hotels.com</span>}
              <Input id="hotels_com_url" value={formData.hotels_com_url} onChange={(e) => handleChange("hotels_com_url", e.target.value)} placeholder="https://hotels.com/..." className="flex-1" />
            </div>

            <div className="flex items-center gap-2">
              <span>🔍</span>
              {formData.trivago_url ? <a href={formData.trivago_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Trivago ↗</a> : <span className="text-sm font-medium">Trivago</span>}
              <Input id="trivago_url" value={formData.trivago_url} onChange={(e) => handleChange("trivago_url", e.target.value)} placeholder="https://trivago.com/..." className="flex-1" />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setShowClearBooking(true)}>🗑️ Effacer toutes les plateformes</Button>
        </div>

        {/* Avis clients */}
        <div className="space-y-4 p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-center justify-between">
            <Label
              className="text-xl font-semibold cursor-pointer hover:text-violet-700 transition-colors"
              title="Cliquer pour copier le nom"
              onClick={() => {
                const name = formData.name || 'Nom Entreprise';
                const city = formData.city || '';
                const text = city ? `${name} ${city}` : name;
                navigator.clipboard.writeText(text);
                toast({ title: `"${text}" copié !` });
              }}
            >Avis clients / {formData.name || 'Nom Entreprise'}{(() => {
              const ratings: { rating: number; count: number }[] = [];
              if (formData.google_rating && formData.google_review_count) {
                ratings.push({ rating: Number(formData.google_rating), count: Number(formData.google_review_count) });
              }
              if (formData.tripadvisor_rating && formData.tripadvisor_review_count) {
                ratings.push({ rating: Number(formData.tripadvisor_rating), count: Number(formData.tripadvisor_review_count) });
              }
              if (formData.restaurant_guru_rating && formData.restaurant_guru_review_count) {
                ratings.push({ rating: Number(formData.restaurant_guru_rating), count: Number(formData.restaurant_guru_review_count) });
              }
              if (ratings.length === 0) return null;
              const totalCount = ratings.reduce((sum, r) => sum + r.count, 0);
              const weightedAvg = ratings.reduce((sum, r) => sum + (r.rating / 5) * 20 * r.count, 0) / totalCount;
              const avg20 = weightedAvg.toFixed(2).replace('.', ',');
              return <><span className="text-black font-bold"> / </span><span className="text-red-600 font-bold">{avg20}/20 sur {totalCount.toLocaleString('fr-FR')} avis clients</span></>;
            })()}</Label>
            {business?.id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  toast({ title: "Sauvegarde des URLs puis récupération des avis..." });
                  try {
                    // Save review URLs to DB first so the edge function uses current values
                    const { error: saveError } = await supabase.from('businesses').update({
                      tripadvisor_review_url: formData.tripadvisor_review_url || null,
                      restaurant_guru_url: formData.restaurant_guru_url || null,
                      google_reviews_url: formData.google_reviews_url || null,
                      google_maps_url: formData.google_maps_url || null,
                    }).eq('id', business.id);
                    if (saveError) throw saveError;

                    const { data, error } = await supabase.functions.invoke('fetch-reviews', {
                      body: { business_id: business.id },
                    });
                    if (error) throw error;
                    if (data?.success && data?.data) {
                      const r = data.data;
                      if (r.google_rating != null) handleChange("google_rating" as any, String(r.google_rating));
                      if (r.google_review_count != null) handleChange("google_review_count" as any, String(r.google_review_count));
                      if (r.tripadvisor_rating != null) handleChange("tripadvisor_rating" as any, String(r.tripadvisor_rating));
                      if (r.tripadvisor_review_count != null) handleChange("tripadvisor_review_count" as any, String(r.tripadvisor_review_count));
                      if (r.restaurant_guru_rating != null) handleChange("restaurant_guru_rating" as any, String(r.restaurant_guru_rating));
                      if (r.restaurant_guru_review_count != null) handleChange("restaurant_guru_review_count" as any, String(r.restaurant_guru_review_count));
                      toast({ title: "Avis récupérés", description: `Champs mis à jour : ${data.updated?.join(', ') || 'aucun'}` });
                    } else {
                      toast({ title: "Aucun avis trouvé", variant: "destructive" });
                    }
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: "Erreur", description: e.message || "Impossible de récupérer les avis", variant: "destructive" });
                  }
                }}
                className="text-xs"
              >
                🔄 Récupérer automatiquement
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TripAdvisorIcon className="text-[#00AF87]" />
            {formData.tripadvisor_review_url ? <a href={formData.tripadvisor_review_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">TripAdvisor Avis ↗</a> : <span className="text-sm font-medium">TripAdvisor Avis</span>}
            <Input id="tripadvisor_review_url" value={formData.tripadvisor_review_url} onChange={(e) => handleChange("tripadvisor_review_url", e.target.value)} placeholder="https://tripadvisor.com/.../reviews" className="flex-1" />
            <Input type="number" step="0.1" min="0" max="5" value={(formData as any).tripadvisor_rating} onChange={(e) => handleChange("tripadvisor_rating" as any, e.target.value)} placeholder="Note" className="w-20" />
            <span className="text-xs text-muted-foreground">/5</span>
            <Input type="number" min="0" value={(formData as any).tripadvisor_review_count} onChange={(e) => handleChange("tripadvisor_review_count" as any, e.target.value)} placeholder="Nb" className="w-20" />
            <span className="text-xs text-muted-foreground">avis</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Effacer TripAdvisor" onClick={() => { handleChange("tripadvisor_review_url", ""); handleChange("tripadvisor_rating" as any, ""); handleChange("tripadvisor_review_count" as any, ""); }}>🗑️</Button>
          </div>
          <div className="flex items-center gap-2">
            <img src={restaurantGuruLogo} alt="Restaurant Guru" className="w-5 h-5 object-contain" />
            {formData.restaurant_guru_url ? <a href={formData.restaurant_guru_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Restaurant Guru ↗</a> : <span className="text-sm font-medium">Restaurant Guru</span>}
            <Input id="restaurant_guru_url" value={formData.restaurant_guru_url} onChange={(e) => handleChange("restaurant_guru_url", e.target.value)} placeholder="https://fr.restaurantguru.com/..." className="flex-1" />
            <Input type="number" step="0.1" min="0" max="5" value={(formData as any).restaurant_guru_rating} onChange={(e) => handleChange("restaurant_guru_rating" as any, e.target.value)} placeholder="Note" className="w-20" />
            <span className="text-xs text-muted-foreground">/5</span>
            <Input type="number" min="0" value={(formData as any).restaurant_guru_review_count} onChange={(e) => handleChange("restaurant_guru_review_count" as any, e.target.value)} placeholder="Nb" className="w-20" />
            <span className="text-xs text-muted-foreground">avis</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Effacer Restaurant Guru" onClick={() => { handleChange("restaurant_guru_url", ""); handleChange("restaurant_guru_rating" as any, ""); handleChange("restaurant_guru_review_count" as any, ""); }}>🗑️</Button>
          </div>
          <div className="flex items-center gap-2">
            <GoogleMapsIcon className="text-[#4285F4]" />
            {formData.google_reviews_url ? <a href={formData.google_reviews_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 text-sm font-medium">Google Avis ↗</a> : <span className="text-sm font-medium">Google Avis</span>}
            <Input id="google_reviews_url" value={formData.google_reviews_url} onChange={(e) => handleChange("google_reviews_url", e.target.value)} placeholder="https://g.page/.../review" className="flex-1" />
            <Input type="number" step="0.1" min="0" max="5" value={(formData as any).google_rating} onChange={(e) => handleChange("google_rating" as any, e.target.value)} placeholder="Note" className="w-20" />
            <span className="text-xs text-muted-foreground">/5</span>
            <Input type="number" min="0" value={(formData as any).google_review_count} onChange={(e) => handleChange("google_review_count" as any, e.target.value)} placeholder="Nb" className="w-20" />
            <span className="text-xs text-muted-foreground">avis</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Effacer Google Avis" onClick={() => { handleChange("google_reviews_url", ""); handleChange("google_rating" as any, ""); handleChange("google_review_count" as any, ""); }}>🗑️</Button>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setShowClearReviews(true)}>🗑️ Effacer tous les avis</Button>
        </div>

        {/* Taxonomie */}
        <div className="space-y-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Label className="text-xl font-semibold">Taxonomie</Label>
          
          {/* Sous-catégories */}
          <div className="space-y-3">
            <Label>Sous-catégories</Label>
            {formData.main_category ? (
            availableSubcategories.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
                {availableSubcategories.map((subcat) => (
                  <label
                    key={subcat}
                    className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(subcat)}
                      onChange={() => handleCategoryToggle(subcat)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{subcat}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Aucune sous-catégorie disponible pour cette catégorie.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Sélectionnez d'abord une catégorie principale.
            </p>
          )}
          {formData.categories.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gold/10 text-gold rounded-md text-sm"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {formData.categories.length > 1 && (
                <div className="mt-3 space-y-2">
                  <Label>Sous-catégorie par défaut</Label>
                  <Select
                    value={formData.categories[0] || ""}
                    onValueChange={(value) => {
                      // Réorganiser les catégories pour mettre la sélectionnée en premier
                      const newCategories = [
                        value,
                        ...formData.categories.filter((c) => c !== value),
                      ];
                      handleChange("categories", newCategories);
                    }}
                  >
                    <SelectTrigger className="w-full md:w-80">
                      <SelectValue placeholder="Choisir la sous-catégorie par défaut..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La sous-catégorie par défaut sera affichée en premier sur la fiche.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Services</Label>
            {formData.services.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleChange("services", [])}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer tous les services
              </Button>
            )}
          </div>
          {formData.main_category ? (
            availableServices.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
                {availableServices.map((service) => (
                  <label
                    key={service}
                    className="flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Aucun service disponible pour cette catégorie.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Sélectionnez d'abord une catégorie principale.
            </p>
          )}
          {formData.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                >
                  {service}
                  <button
                    type="button"
                    onClick={() => handleServiceToggle(service)}
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Mots-clés (séparés par virgule)</Label>
          <Input
            id="keywords"
            value={formData.keywords}
            onChange={(e) => handleChange("keywords", e.target.value)}
            placeholder="luxe, traditionnel, médina"
          />
        </div>

        {/* Opening Hours */}
        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-xl font-semibold">Horaires d'ouverture</Label>
          <OpeningHoursEditor
            value={formData.opening_hours}
            onChange={(hours) => handleChange("opening_hours", hours as any)}
          />
          <div className="flex flex-col gap-2 p-3 border rounded-lg bg-white/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_open_24h}
                onChange={(e) => handleChange("is_open_24h", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Ouvert 24h/24</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.show_opening_hours}
                onChange={(e) => handleChange("show_opening_hours", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-medium">Afficher les horaires sur la fiche publique</span>
            </label>
          </div>
          
          {/* Vacation Dates */}
          <VacationDatesEditor
            value={formData.vacation_dates}
            onChange={(dates) => setFormData(prev => ({ ...prev, vacation_dates: dates }))}
          />
        </div>

        {/* Internal Notes - Staff Only */}
        <div className="space-y-2 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <Label htmlFor="internal_notes" className="text-xl font-semibold text-amber-800 dark:text-amber-200">
              Note interne (staff uniquement)
            </Label>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {formData.internal_notes.replace(/<[^>]*>/g, '').length} / 5000 caractères
            </span>
          </div>
          <RichTextEditor
            content={formData.internal_notes}
            onChange={(html) => {
              const textContent = html.replace(/<[^>]*>/g, '');
              if (textContent.length <= 5000) {
                handleChange("internal_notes", html);
              }
            }}
          />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Ces notes sont visibles uniquement par le staff et ne seront pas affichées publiquement.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter sans enregistrer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rester</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter sans sauvegarder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearSocial} onOpenChange={setShowClearSocial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer les réseaux sociaux ?</AlertDialogTitle>
            <AlertDialogDescription>Tous les liens de réseaux sociaux seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("facebook_url", ""); handleChange("instagram_url", ""); handleChange("twitter_url", ""); handleChange("linkedin_url", ""); handleChange("youtube_url", ""); handleChange("tiktok_url", ""); handleChange("pinterest_url", ""); handleChange("vimeo_url", ""); toast({ title: "Réseaux sociaux effacés" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearBooking} onOpenChange={setShowClearBooking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer les plateformes de réservation ?</AlertDialogTitle>
            <AlertDialogDescription>Tous les liens de réservation seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("reserve_now_url", ""); handleChange("booking_url", ""); handleChange("tripadvisor_url", ""); handleChange("airbnb_url", ""); handleChange("hotels_com_url", ""); handleChange("trivago_url", ""); toast({ title: "Plateformes de réservation effacées" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearReviews} onOpenChange={setShowClearReviews}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Effacer tous les avis ?</AlertDialogTitle>
            <AlertDialogDescription>Toutes les URLs, notes et nombres d'avis seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleChange("tripadvisor_review_url", ""); handleChange("tripadvisor_rating" as any, ""); handleChange("tripadvisor_review_count" as any, ""); handleChange("restaurant_guru_url", ""); handleChange("restaurant_guru_rating" as any, ""); handleChange("restaurant_guru_review_count" as any, ""); handleChange("google_reviews_url", ""); handleChange("google_rating" as any, ""); handleChange("google_review_count" as any, ""); toast({ title: "Avis clients effacés" }); }}>Oui, effacer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BusinessForm;
