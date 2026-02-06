import { useState, useEffect } from "react";
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
import { ArrowLeft, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import PDFUploader from "./PDFUploader";
import LogoUploader from "./LogoUploader";
import LabelUploader from "./LabelUploader";
import OpeningHoursEditor, { OpeningHours, DEFAULT_OPENING_HOURS } from "./OpeningHoursEditor";
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
} from "./SocialMediaIcons";

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
  const { toast } = useToast();
  
  // Dynamic subcategories and services from database
  const [dbCategories, setDbCategories] = useState<Array<{ id: string; name_fr: string }>>([]);
  const [dbSubcategories, setDbSubcategories] = useState<Array<{ id: string; name_fr: string; category_id: string }>>([]);
  const [dbServices, setDbServices] = useState<Array<{ id: string; name_fr: string; subcategory_id: string }>>([]);

  // Fetch categories, subcategories, and services from database
  useEffect(() => {
    const fetchTaxonomy = async () => {
      const [catRes, subRes, servRes] = await Promise.all([
        supabase.from("categories").select("id, name_fr").order("sort_order"),
        supabase.from("subcategories").select("id, name_fr, category_id").order("sort_order"),
        supabase.from("services").select("id, name_fr, subcategory_id").order("sort_order"),
      ]);
      
      if (catRes.data) setDbCategories(catRes.data);
      if (subRes.data) setDbSubcategories(subRes.data);
      if (servRes.data) setDbServices(servRes.data);
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
    priority_score: business?.priority_score?.toString() || "0",
    logo_url: business?.logo_url || "",
    ice: (business as any)?.ice || "",
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
    images: (business as any)?.images || [] as string[],
    pdf_url: (business as any)?.pdf_url || "",
    label1_url: (business as any)?.label1_url || "",
    online_shop_url: (business as any)?.online_shop_url || "",
    opening_hours: (business as any)?.opening_hours as OpeningHours | null,
  });

  const handleChange = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
  const selectedCategory = dbCategories.find(c => c.name_fr === formData.main_category);
  
  // Get subcategories for selected category from database
  const availableSubcategories = selectedCategory
    ? dbSubcategories.filter(sub => sub.category_id === selectedCategory.id).map(sub => sub.name_fr)
    : [];

  // Get services for selected subcategories from database
  const selectedSubcategoryIds = dbSubcategories
    .filter(sub => formData.categories.includes(sub.name_fr))
    .map(sub => sub.id);
  
  const availableServices = selectedSubcategoryIds.length > 0
    ? dbServices.filter(srv => selectedSubcategoryIds.includes(srv.subcategory_id)).map(srv => srv.name_fr)
    : [];

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
      priority_score: parseInt(formData.priority_score) || 0,
      logo_url: formData.logo_url || null,
      ice: formData.ice || null,
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
      images: formData.images.length > 0 ? formData.images : [],
      pdf_url: formData.pdf_url || null,
      label1_url: formData.label1_url || null,
      online_shop_url: formData.online_shop_url || null,
      opening_hours: formData.opening_hours ? JSON.parse(JSON.stringify(formData.opening_hours)) : null,
    };

    try {
      if (business) {
        // Update
        const { error } = await supabase
          .from("businesses")
          .update(businessData)
          .eq("id", business.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entreprise mise à jour avec succès.",
        });
      } else {
        // Create
        const { error } = await supabase
          .from("businesses")
          .insert(businessData);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Entreprise créée avec succès.",
        });
      }

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
          <Button variant="ghost" size="sm" onClick={onCancel}>
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
        {/* Status, Priority & Featured - Section principale */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wtuce_status">Statut</Label>
              <Select
                value={formData.wtuce_status}
                onValueChange={(value) => handleChange("wtuce_status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="verified">Vérifié</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority_score">Score de priorité</Label>
              <Input
                id="priority_score"
                type="number"
                value={formData.priority_score}
                onChange={(e) => handleChange("priority_score", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">URL du logo</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => handleChange("logo_url", e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_featured"
              checked={formData.is_featured}
              onChange={(e) => handleChange("is_featured", e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="is_featured">Entreprise mise en avant</Label>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Logo</Label>
          <LogoUploader
            logoUrl={formData.logo_url}
            onChange={(url) => handleChange("logo_url", url)}
            businessId={business?.id}
          />
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ice">ICE (max 20 chiffres)</Label>
            <Input
              id="ice"
              value={formData.ice}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 20);
                handleChange("ice", value);
              }}
              placeholder="000000000000000"
              maxLength={20}
              pattern="[0-9]*"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="main_category">Catégorie principale</Label>
            <Select
              value={formData.main_category}
              onValueChange={(value) => handleChange("main_category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
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
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <RichTextEditor
            content={formData.description}
            onChange={(html) => handleChange("description", html)}
          />
        </div>

        {/* Images */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Images (max 10)</Label>
          <ImageUploader
            images={formData.images}
            onChange={(images) => handleChange("images", images)}
            maxImages={10}
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

        {/* Label1 */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Label1</Label>
          <LabelUploader
            labelUrl={formData.label1_url}
            onChange={(url) => handleChange("label1_url", url)}
            businessId={business?.id}
            label="Label1"
            labelKey="label1"
          />
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Région *</Label>
            <Select
              value={formData.region}
              onValueChange={(value) => handleChange("region", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
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

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => handleChange("latitude", e.target.value)}
              placeholder="31.6295"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => handleChange("longitude", e.target.value)}
              placeholder="-7.9811"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+212 5XX-XXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="online_shop_url">Boutique en ligne</Label>
            <Input
              id="online_shop_url"
              value={formData.online_shop_url}
              onChange={(e) => handleChange("online_shop_url", e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>

        {/* Opening Hours */}
        <OpeningHoursEditor
          value={formData.opening_hours}
          onChange={(hours) => handleChange("opening_hours", hours as any)}
        />

        {/* Social Media */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Réseaux sociaux</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook_url" className="flex items-center gap-2">
                <FacebookIcon className="text-[#1877F2]" />
                Facebook
              </Label>
              <Input
                id="facebook_url"
                value={formData.facebook_url}
                onChange={(e) => handleChange("facebook_url", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_url" className="flex items-center gap-2">
                <InstagramIcon className="text-[#E4405F]" />
                Instagram
              </Label>
              <Input
                id="instagram_url"
                value={formData.instagram_url}
                onChange={(e) => handleChange("instagram_url", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_url" className="flex items-center gap-2">
                <TwitterIcon className="text-foreground" />
                X (Twitter)
              </Label>
              <Input
                id="twitter_url"
                value={formData.twitter_url}
                onChange={(e) => handleChange("twitter_url", e.target.value)}
                placeholder="https://x.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                <LinkedInIcon className="text-[#0A66C2]" />
                LinkedIn
              </Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => handleChange("linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/company/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube_url" className="flex items-center gap-2">
                <YouTubeIcon className="text-[#FF0000]" />
                YouTube
              </Label>
              <Input
                id="youtube_url"
                value={formData.youtube_url}
                onChange={(e) => handleChange("youtube_url", e.target.value)}
                placeholder="https://youtube.com/@..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                <TikTokIcon className="text-foreground" />
                TikTok
              </Label>
              <Input
                id="tiktok_url"
                value={formData.tiktok_url}
                onChange={(e) => handleChange("tiktok_url", e.target.value)}
                placeholder="https://tiktok.com/@..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <WhatsAppIcon className="text-[#25D366]" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                placeholder="+212 6XX-XXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tripadvisor_url" className="flex items-center gap-2">
                <TripAdvisorIcon className="text-[#00AF87]" />
                TripAdvisor
              </Label>
              <Input
                id="tripadvisor_url"
                value={formData.tripadvisor_url}
                onChange={(e) => handleChange("tripadvisor_url", e.target.value)}
                placeholder="https://tripadvisor.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_url" className="flex items-center gap-2">
                <BookingIcon className="text-[#003580]" />
                Booking.com
              </Label>
              <Input
                id="booking_url"
                value={formData.booking_url}
                onChange={(e) => handleChange("booking_url", e.target.value)}
                placeholder="https://booking.com/hotel/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google_maps_url" className="flex items-center gap-2">
                <GoogleMapsIcon className="text-[#4285F4]" />
                Google Maps
              </Label>
              <Input
                id="google_maps_url"
                value={formData.google_maps_url}
                onChange={(e) => handleChange("google_maps_url", e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airbnb_url" className="flex items-center gap-2">
                <AirbnbIcon className="text-[#FF5A5F]" />
                Airbnb
              </Label>
              <Input
                id="airbnb_url"
                value={formData.airbnb_url}
                onChange={(e) => handleChange("airbnb_url", e.target.value)}
                placeholder="https://airbnb.com/rooms/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pinterest_url" className="flex items-center gap-2">
                <PinterestIcon className="text-[#E60023]" />
                Pinterest
              </Label>
              <Input
                id="pinterest_url"
                value={formData.pinterest_url}
                onChange={(e) => handleChange("pinterest_url", e.target.value)}
                placeholder="https://pinterest.com/..."
              />
            </div>
          </div>
        </div>


        {/* Video */}
        <div className="space-y-4">
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

        {/* Metadata */}
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
          )}
        </div>

        <div className="space-y-3">
          <Label>Services</Label>
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

        <div className="space-y-2">
          <Label htmlFor="keywords">Mots-clés (séparés par virgule)</Label>
          <Input
            id="keywords"
            value={formData.keywords}
            onChange={(e) => handleChange("keywords", e.target.value)}
            placeholder="luxe, traditionnel, médina"
          />
        </div>

        {/* Internal Notes - Staff Only */}
        <div className="space-y-2 p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <Label htmlFor="internal_notes" className="text-amber-800 dark:text-amber-200">
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
    </div>
  );
};

export default BusinessForm;
