import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HScroll from "@/components/HScroll";
import {
  Loader2, ArrowLeft, Globe, CheckCircle2, AlertCircle, ExternalLink,
  Save, Facebook, Instagram, Youtube, MapPin, Star, Building2, Phone, Clock, HelpCircle, MessageSquare, Cloud, FileText, Sparkles, ImageIcon, Video, Plus, Tag, Wrench
} from "lucide-react";
import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";
import { type OpeningHours } from "@/components/staff/OpeningHoursEditor";
import AffiliateOpeningHoursEditor from "@/components/affiliate/AffiliateOpeningHoursEditor";
import AffiliateContactEditor, { type CityOption, type NeighborhoodOption, type CtaUrlItem } from "@/components/affiliate/AffiliateContactEditor";
import AffiliatePlatformHelp from "@/components/affiliate/AffiliatePlatformHelp";
import AffiliateYextInfo from "@/components/affiliate/AffiliateYextInfo";
import YextSyncButton from "@/components/affiliate/YextSyncButton";
import AffiliateReviewsEditor, { type ReviewsData } from "@/components/affiliate/AffiliateReviewsEditor";
import AffiliateTextEditor from "@/components/affiliate/AffiliateTextEditor";
import AffiliateHighlightsEditor from "@/components/affiliate/AffiliateHighlightsEditor";
import AffiliatePromotionsEditor from "@/components/affiliate/AffiliatePromotionsEditor";
import AffiliateServicesEditor from "@/components/affiliate/AffiliateServicesEditor";
import AffiliateImagesEditor from "@/components/affiliate/AffiliateImagesEditor";
import AffiliateVideosEditor from "@/components/affiliate/AffiliateVideosEditor";
import VacationDatesEditor, { type VacationPeriod } from "@/components/staff/VacationDatesEditor";
import { Label } from "@/components/ui/label";

const PLATFORMS = [
  { key: "google_maps_url", label: "Google Business", icon: <MapPin className="h-4 w-4" />, color: "text-blue-500" },
  { key: "google_reviews_url", label: "Google Reviews", icon: <Star className="h-4 w-4" />, color: "text-yellow-500" },
  { key: "facebook_url", label: "Facebook", icon: <Facebook className="h-4 w-4" />, color: "text-blue-600" },
  { key: "instagram_url", label: "Instagram", icon: <InstagramIcon className="h-4 w-4" />, color: "text-pink-500" },
  { key: "tiktok_url", label: "TikTok", icon: <TikTokIcon className="h-4 w-4" />, color: "text-foreground" },
  { key: "youtube_url", label: "YouTube", icon: <Youtube className="h-4 w-4" />, color: "text-red-500" },
  { key: "pinterest_url", label: "Pinterest", icon: <PinterestIcon className="h-4 w-4" />, color: "text-red-600" },
  { key: "linkedin_url", label: "LinkedIn", icon: <Globe className="h-4 w-4" />, color: "text-blue-700" },
  { key: "twitter_url", label: "X (Twitter)", icon: <Globe className="h-4 w-4" />, color: "text-foreground" },
  { key: "website", label: "Site web", icon: <Globe className="h-4 w-4" />, color: "text-emerald-500" },
  { key: "tripadvisor_url", label: "TripAdvisor", icon: <Globe className="h-4 w-4" />, color: "text-green-600" },
  { key: "booking_url", label: "Booking.com", icon: <Globe className="h-4 w-4" />, color: "text-blue-800" },
  { key: "restaurant_guru_url", label: "Restaurant Guru", icon: <Globe className="h-4 w-4" />, color: "text-orange-500" },
  { key: "tripadvisor_review_url", label: "TripAdvisor Reviews", icon: <Star className="h-4 w-4" />, color: "text-green-600" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["key"];

const CTA_URL_DEFS: Array<{ urlField: string; ctaField: string; externalField: string; label: string; defaultCta?: string }> = [
  { urlField: "website",         ctaField: "website_cta",       externalField: "website_force_external",       label: "URL 1 · Site web", defaultCta: "Site web" },
  { urlField: "reserve_now_url", ctaField: "reserve_now_cta",   externalField: "reserve_now_force_external",   label: "URL 2 · Réserver", defaultCta: "Réservez" },
  { urlField: "online_shop_url", ctaField: "online_shop_cta",   externalField: "online_shop_force_external",   label: "URL 3 · Boutique", defaultCta: "Achetez" },
  { urlField: "url_4",           ctaField: "url_4_cta",         externalField: "url_4_force_external",         label: "URL 4" },
  { urlField: "url_5",           ctaField: "url_5_cta",         externalField: "url_5_force_external",         label: "URL 5" },
];

const CTA_EXTRA_FIELDS = CTA_URL_DEFS.flatMap(d => [d.urlField, d.ctaField, d.externalField])
  .filter(f => f !== "website"); // website is already in PLATFORMS

const REVIEW_FIELDS = [
  "google_rating", "google_review_count",
  "tripadvisor_rating", "tripadvisor_review_count",
  "restaurant_guru_rating", "restaurant_guru_review_count",
  "getyourguide_url", "getyourguide_rating", "getyourguide_review_count",
  "viator_url", "viator_rating", "viator_review_count",
  "tourradar_url", "tourradar_rating", "tourradar_review_count",
  "avis_verifies_url", "avis_verifies_rating", "avis_verifies_review_count",
  "trustpilot_url", "trustpilot_rating", "trustpilot_review_count",
  "kayak_url", "kayak_rating", "kayak_review_count",
];

interface BusinessPresence {
  id: string;
  name: string;
  city: string | null;
  main_category: string | null;
  logo_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: OpeningHours | null;
  show_opening_hours: boolean;
  closure_message: string | null;
  vacation_dates: VacationPeriod[];
  links: Record<PlatformKey, string | null>;
  cta: Record<string, any>;
  reviews: Record<string, any>;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ar: string | null;
}

const AffiliatePresence = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessPresence[]>([]);
  const [editedFields, setEditedFields] = useState<Record<string, Record<string, any>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadBusinesses = async (targetAffiliateId: string) => {
    const selectFields = ["id", "name", "city", "main_category", "logo_url", "phone", "whatsapp", "email",
      "address", "neighborhood", "latitude", "longitude", "opening_hours",
      "show_opening_hours", "closure_message", "vacation_dates",
      "hook_fr", "hook_en", "hook_ar", "description", "description_en", "description_ar",
      ...PLATFORMS.map(p => p.key),
      ...CTA_EXTRA_FIELDS,
      ...REVIEW_FIELDS].join(",");

    const [{ data: biz }, { data: citiesData }, { data: neighborhoodsData }] = await Promise.all([
      supabase.from("businesses").select(selectFields).eq("affiliate_id", targetAffiliateId).eq("is_active", true).order("name"),
      supabase.from("cities").select("id, name_fr, region").order("name_fr"),
      supabase.from("neighborhoods").select("id, name, city_id").order("name"),
    ]);
    setCities((citiesData as CityOption[]) || []);
    setNeighborhoods((neighborhoodsData as NeighborhoodOption[]) || []);

    const mapped: BusinessPresence[] = (biz || []).map((b: any) => {
      const cta: Record<string, any> = {};
      CTA_URL_DEFS.forEach(d => {
        cta[d.urlField] = b[d.urlField] ?? null;
        cta[d.ctaField] = b[d.ctaField] ?? null;
        cta[d.externalField] = b[d.externalField] ?? false;
      });
      const reviews: Record<string, any> = {};
      REVIEW_FIELDS.forEach(f => { reviews[f] = b[f] ?? null; });
      return {
        id: b.id,
        name: b.name,
        city: b.city,
        main_category: b.main_category,
        logo_url: b.logo_url,
        phone: b.phone,
        whatsapp: b.whatsapp,
        email: b.email,
        address: b.address,
        neighborhood: b.neighborhood,
        latitude: b.latitude,
        longitude: b.longitude,
        opening_hours: b.opening_hours as OpeningHours | null,
        show_opening_hours: b.show_opening_hours ?? true,
        closure_message: b.closure_message ?? null,
        vacation_dates: (b.vacation_dates as VacationPeriod[] | null) ?? [],
        links: Object.fromEntries(PLATFORMS.map(p => [p.key, b[p.key] || null])) as Record<PlatformKey, string | null>,
        cta,
        reviews,
        hook_fr: b.hook_fr ?? null,
        hook_en: b.hook_en ?? null,
        hook_ar: b.hook_ar ?? null,
        description: b.description ?? null,
        description_en: b.description_en ?? null,
        description_ar: b.description_ar ?? null,
      };
    });

    setBusinesses(mapped);
    if (mapped.length > 0 && !mapped.find(b => b.id === selectedBusiness)) {
      setSelectedBusiness(mapped[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/affiliates"); return; }

      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!affiliate) {
        toast({ title: "Aucun compte affilié trouvé", variant: "destructive" });
        navigate("/affiliates/dashboard");
        return;
      }

      setAffiliateId(affiliate.id);
      await loadBusinesses(affiliate.id);
    };
    init();
  }, [navigate, toast]);

  const getBusinessCompleteness = (b: BusinessPresence) => {
    const filled = PLATFORMS.filter(p => b.links[p.key]).length;
    return { filled, total: PLATFORMS.length, percent: Math.round((filled / PLATFORMS.length) * 100) };
  };

  const handleFieldChange = (businessId: string, key: string, value: any) => {
    setEditedFields(prev => ({
      ...prev,
      [businessId]: { ...prev[businessId], [key]: value },
    }));
  };

  const handleSave = async (businessId: string) => {
    const edits = editedFields[businessId];
    if (!edits || Object.keys(edits).length === 0) return;

    const reviewNumericKeys = new Set(REVIEW_FIELDS.filter(f => f.endsWith("_rating") || f.endsWith("_review_count")));
    const payload: Record<string, any> = {};
    Object.entries(edits).forEach(([k, v]) => {
      if (reviewNumericKeys.has(k)) {
        if (v === "" || v === null || v === undefined) payload[k] = null;
        else {
          const n = Number(v);
          payload[k] = Number.isFinite(n) ? n : null;
        }
      } else {
        payload[k] = v;
      }
    });

    setSavingId(businessId);
    const { error } = await supabase
      .from("businesses")
      .update(payload)
      .eq("id", businessId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const ctaKeys = new Set(CTA_URL_DEFS.flatMap(d => [d.urlField, d.ctaField, d.externalField]));
      const reviewKeys = new Set(REVIEW_FIELDS);
      setBusinesses(prev => prev.map(b => {
        if (b.id !== businessId) return b;
        const updated = { ...b, cta: { ...b.cta }, reviews: { ...b.reviews } };
        Object.entries(payload).forEach(([k, v]) => {
          if (ctaKeys.has(k)) {
            updated.cta[k] = typeof v === "boolean" ? v : (v === "" ? null : v);
          }
          if (reviewKeys.has(k)) {
            updated.reviews[k] = v;
          }
          if (k in b.links) {
            (updated.links as any)[k] = v || null;
          } else if (k === "opening_hours") {
            updated.opening_hours = v;
          } else if (!ctaKeys.has(k) && !reviewKeys.has(k)) {
            (updated as any)[k] = v === "" ? null : v;
          }
        });
        return updated;
      }));
      setEditedFields(prev => { const n = { ...prev }; delete n[businessId]; return n; });
      toast({ title: "Modifications enregistrées ✓" });
    }
    setSavingId(null);
  };

  const handleCreateBusiness = async () => {
    const name = newBusinessName.trim();
    if (!name) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom de l'établissement.", variant: "destructive" });
      return;
    }
    if (!affiliateId) {
      toast({ title: "Erreur", description: "Compte affilié introuvable.", variant: "destructive" });
      return;
    }
    setIsCreating(true);

    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let slug = baseSlug || `etablissement-${Date.now()}`;
    let suffix = 0;
    while (true) {
      const testSlug = suffix === 0 ? slug : `${slug}-${suffix}`;
      const { data: existing } = await supabase.from("businesses").select("id").eq("slug", testSlug).maybeSingle();
      if (!existing) { slug = testSlug; break; }
      suffix += 1;
      if (suffix > 50) { slug = `${baseSlug}-${Date.now()}`; break; }
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert([{ name, affiliate_id: affiliateId, slug, is_active: true } as any])
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Erreur lors de la création", description: error?.message || "Réponse vide", variant: "destructive" });
    } else {
      toast({ title: "Établissement créé ✓" });
      setNewBusinessName("");
      setIsCreateDialogOpen(false);
      await loadBusinesses(affiliateId);
      setSelectedBusiness(data.id);
    }
    setIsCreating(false);
  };

  const currentBusiness = businesses.find(b => b.id === selectedBusiness);
  const hasEdits = selectedBusiness ? Object.keys(editedFields[selectedBusiness] || {}).length > 0 : false;

  const getCurrentValue = (bizId: string, key: string, original: any) => {
    return editedFields[bizId]?.[key] !== undefined ? editedFields[bizId][key] : (original ?? "");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <HomeMindtripHeader />
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/affiliates/dashboard")} className="text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Présence en ligne</h1>
            <p className="text-sm text-white/70">Gérez les profils, horaires et coordonnées de vos établissements</p>
          </div>
        </div>

        {businesses.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun établissement associé à votre compte.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Créer mon premier établissement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Business horizontal strip */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white uppercase tracking-wider">
                  Vos établissements
                </p>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
                      <Plus className="h-4 w-4 mr-1" /> Nouvel établissement
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border text-foreground">
                    <DialogHeader>
                      <DialogTitle>Créer un nouvel établissement</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Saisissez le nom de l'établissement. Vous pourrez compléter les onglets (Contact, Horaires, Texte, Images, etc.) juste après.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="new-business-name" className="mb-2 block">Nom de l'établissement</Label>
                      <Input
                        id="new-business-name"
                        value={newBusinessName}
                        onChange={(e) => setNewBusinessName(e.target.value)}
                        placeholder="Ex. Riad Dar Najat"
                        disabled={isCreating}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateBusiness(); }}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>Annuler</Button>
                      <Button onClick={handleCreateBusiness} disabled={isCreating || !newBusinessName.trim()}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        Créer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <HScroll className="flex gap-3 pb-3 -mb-1 overflow-x-auto">
                {businesses.map(b => {
                  const isSelected = b.id === selectedBusiness;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBusiness(b.id)}
                      className={`shrink-0 text-left p-3 rounded-lg border transition-colors min-w-[200px] max-w-[260px] ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-foreground"}`}>{b.name}</p>
                        <p className={`text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>{b.city || "—"}</p>
                      </div>
                    </button>
                  );
                })}
              </HScroll>
            </div>

            {/* Editor Panel */}
            {currentBusiness && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{currentBusiness.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getBusinessCompleteness(currentBusiness).filled}/{PLATFORMS.length} plateformes configurées
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        disabled={!hasEdits || savingId === currentBusiness.id}
                        onClick={() => handleSave(currentBusiness.id)}
                      >
                        {savingId === currentBusiness.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="mb-4 w-full overflow-x-auto whitespace-nowrap flex-nowrap justify-start gap-1 pb-1 scrollbar-thin">
                      <TabsTrigger value="text" className="gap-1.5 shrink-0">
                        <FileText className="h-3.5 w-3.5 shrink-0" /> Texte
                      </TabsTrigger>
                      <TabsTrigger value="links" className="gap-1.5 shrink-0">
                        <Globe className="h-3.5 w-3.5 shrink-0" /> Liens
                      </TabsTrigger>
                      <TabsTrigger value="contact" className="gap-1.5 shrink-0">
                        <Phone className="h-3.5 w-3.5 shrink-0" /> Contact
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="gap-1.5 shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" /> Avis Clients
                      </TabsTrigger>
                      <TabsTrigger value="hours" className="gap-1.5 shrink-0">
                        <Clock className="h-3.5 w-3.5 shrink-0" /> Horaires
                      </TabsTrigger>
                      <TabsTrigger value="blocks" className="gap-1.5 shrink-0">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" /> Blocs
                      </TabsTrigger>
                      <TabsTrigger value="services" className="gap-1.5 shrink-0">
                        <Wrench className="h-3.5 w-3.5 shrink-0" /> Services
                      </TabsTrigger>
                      <TabsTrigger value="promotions" className="gap-1.5 shrink-0">
                        <Tag className="h-3.5 w-3.5 shrink-0" /> Offres
                      </TabsTrigger>
                      <TabsTrigger value="images" className="gap-1.5 shrink-0">
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" /> Images
                      </TabsTrigger>
                      <TabsTrigger value="videos" className="gap-1.5 shrink-0">
                        <Video className="h-3.5 w-3.5 shrink-0" /> Vidéos
                      </TabsTrigger>
                      <TabsTrigger value="help" className="gap-1.5 shrink-0">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0" /> Plateformes
                      </TabsTrigger>
                      <TabsTrigger value="yext" className="gap-1.5 shrink-0">
                        <Cloud className="h-3.5 w-3.5 shrink-0" /> Yext
                      </TabsTrigger>
                    </TabsList>

                    {/* Links Tab */}
                    <TabsContent value="links" className="space-y-3">
                      {PLATFORMS.map(platform => {
                        const currentValue = getCurrentValue(currentBusiness.id, platform.key, currentBusiness.links[platform.key]);
                        const isFilled = !!currentValue;
                        const isEdited = editedFields[currentBusiness.id]?.[platform.key] !== undefined;

                        return (
                          <div key={platform.key} className="flex items-center gap-3">
                            <div className={`shrink-0 ${platform.color}`}>
                              {platform.icon}
                            </div>
                            <div className="w-[130px] shrink-0">
                              <span className="text-sm font-medium text-foreground">{platform.label}</span>
                            </div>
                            <div className="flex-1 relative">
                              <Input
                                value={currentValue}
                                onChange={(e) => handleFieldChange(currentBusiness.id, platform.key, e.target.value)}
                                placeholder={`URL ${platform.label}...`}
                                className={`text-xs pr-8 ${isEdited ? "border-primary" : ""}`}
                              />
                              {currentValue && (
                                <a
                                  href={currentValue}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="shrink-0">
                              {isFilled ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    {/* Contact Tab */}
                    <TabsContent value="contact">
                      <AffiliateContactEditor
                        phone={getCurrentValue(currentBusiness.id, "phone", currentBusiness.phone)}
                        whatsapp={getCurrentValue(currentBusiness.id, "whatsapp", currentBusiness.whatsapp)}
                        email={getCurrentValue(currentBusiness.id, "email", currentBusiness.email)}
                        address={getCurrentValue(currentBusiness.id, "address", currentBusiness.address)}
                        neighborhood={getCurrentValue(currentBusiness.id, "neighborhood", currentBusiness.neighborhood)}
                        city={getCurrentValue(currentBusiness.id, "city", currentBusiness.city)}
                        googleMapsUrl={getCurrentValue(currentBusiness.id, "google_maps_url", currentBusiness.links.google_maps_url)}
                        latitude={getCurrentValue(currentBusiness.id, "latitude", currentBusiness.latitude)}
                        longitude={getCurrentValue(currentBusiness.id, "longitude", currentBusiness.longitude)}
                        cities={cities}
                        neighborhoods={neighborhoods}
                        ctaUrls={CTA_URL_DEFS.map<CtaUrlItem>((d) => {
                          // website URL lives in the links map, others live at top-level
                          const originalUrl = d.urlField === "website"
                            ? currentBusiness.links.website
                            : currentBusiness.cta[d.urlField];
                          return {
                            urlField: d.urlField,
                            ctaField: d.ctaField,
                            externalField: d.externalField,
                            label: d.label,
                            url: getCurrentValue(currentBusiness.id, d.urlField, originalUrl) ?? "",
                            cta: getCurrentValue(currentBusiness.id, d.ctaField, currentBusiness.cta[d.ctaField] || d.defaultCta) ?? "",
                            forceExternal: !!getCurrentValue(currentBusiness.id, d.externalField, currentBusiness.cta[d.externalField]),
                          };
                        })}
                        onPhoneChange={(v) => handleFieldChange(currentBusiness.id, "phone", v)}
                        onWhatsappChange={(v) => handleFieldChange(currentBusiness.id, "whatsapp", v)}
                        onEmailChange={(v) => handleFieldChange(currentBusiness.id, "email", v)}
                        onAddressChange={(v) => handleFieldChange(currentBusiness.id, "address", v)}
                        onNeighborhoodChange={(v) => handleFieldChange(currentBusiness.id, "neighborhood", v)}
                        onCityChange={(v) => handleFieldChange(currentBusiness.id, "city", v)}
                        onGoogleMapsUrlChange={(v) => handleFieldChange(currentBusiness.id, "google_maps_url", v)}
                        onLatitudeChange={(v) => handleFieldChange(currentBusiness.id, "latitude", v)}
                        onLongitudeChange={(v) => handleFieldChange(currentBusiness.id, "longitude", v)}
                        onCtaFieldChange={(field, value) => handleFieldChange(currentBusiness.id, field, value)}
                      />
                    </TabsContent>

                    {/* Reviews Tab */}
                    <TabsContent value="reviews">
                      {(() => {
                        // Build merged reviews data: original + local edits + URLs from links map.
                        const merged: ReviewsData = {
                          ...currentBusiness.reviews,
                          google_reviews_url: getCurrentValue(currentBusiness.id, "google_reviews_url", currentBusiness.links.google_reviews_url),
                          tripadvisor_review_url: getCurrentValue(currentBusiness.id, "tripadvisor_review_url", currentBusiness.links.tripadvisor_review_url),
                          restaurant_guru_url: getCurrentValue(currentBusiness.id, "restaurant_guru_url", currentBusiness.links.restaurant_guru_url),
                        };
                        REVIEW_FIELDS.forEach(f => {
                          (merged as any)[f] = getCurrentValue(currentBusiness.id, f, currentBusiness.reviews[f]);
                        });
                        return (
                          <AffiliateReviewsEditor
                            businessId={currentBusiness.id}
                            data={merged}
                            onFieldChange={(field, value) => handleFieldChange(currentBusiness.id, field, value)}
                            onDataRefreshed={(patch) => {
                              // Update local business state & links map, clear edits for touched keys.
                              setBusinesses(prev => prev.map(b => {
                                if (b.id !== currentBusiness.id) return b;
                                const updated = { ...b, reviews: { ...b.reviews }, links: { ...b.links } };
                                Object.entries(patch).forEach(([k, v]) => {
                                  if (k in updated.links) (updated.links as any)[k] = v || null;
                                  if (k in updated.reviews || REVIEW_FIELDS.includes(k)) updated.reviews[k] = v;
                                });
                                return updated;
                              }));
                              setEditedFields(prev => {
                                const cur = { ...(prev[currentBusiness.id] || {}) };
                                Object.keys(patch).forEach(k => { delete cur[k]; });
                                return { ...prev, [currentBusiness.id]: cur };
                              });
                            }}
                          />
                        );
                      })()}
                    </TabsContent>

                    {/* Hours Tab */}
                    <TabsContent value="hours" className="space-y-6">
                      <AffiliateOpeningHoursEditor
                        value={getCurrentValue(currentBusiness.id, "opening_hours", currentBusiness.opening_hours) || null}
                        onChange={(hours) => handleFieldChange(currentBusiness.id, "opening_hours", hours)}
                        showOpeningHours={!!getCurrentValue(currentBusiness.id, "show_opening_hours", currentBusiness.show_opening_hours)}
                      />

                      <div className="flex flex-col gap-3 p-3 border rounded-lg bg-white/5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!getCurrentValue(currentBusiness.id, "show_opening_hours", currentBusiness.show_opening_hours)}
                            onChange={(e) => handleFieldChange(currentBusiness.id, "show_opening_hours", e.target.checked)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm font-medium">Afficher les horaires sur la fiche publique</span>
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium whitespace-nowrap">Message du front</Label>
                          <select
                            value={getCurrentValue(currentBusiness.id, "closure_message", currentBusiness.closure_message) || ""}
                            onChange={(e) => handleFieldChange(currentBusiness.id, "closure_message", e.target.value || null)}
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">Aucun</option>
                            <option value="Fermé temporairement">Fermé temporairement</option>
                            <option value="Fermé jusqu'au">Fermé jusqu&apos;au</option>
                            <option value="Fermé définitivement">Fermé définitivement</option>
                            <option value="Fermé jusqu'à nouvel ordre">Fermé jusqu&apos;à nouvel ordre</option>
                          </select>
                        </div>
                      </div>

                      <VacationDatesEditor
                        value={getCurrentValue(currentBusiness.id, "vacation_dates", currentBusiness.vacation_dates) || []}
                        onChange={(dates) => handleFieldChange(currentBusiness.id, "vacation_dates", dates)}
                      />
                    </TabsContent>

                    {/* Text Tab */}
                    <TabsContent value="text">
                      <AffiliateTextEditor
                        hookFr={getCurrentValue(currentBusiness.id, "hook_fr", currentBusiness.hook_fr) || ""}
                        hookEn={getCurrentValue(currentBusiness.id, "hook_en", currentBusiness.hook_en) || ""}
                        hookAr={getCurrentValue(currentBusiness.id, "hook_ar", currentBusiness.hook_ar) || ""}
                        descriptionFr={getCurrentValue(currentBusiness.id, "description", currentBusiness.description) || ""}
                        descriptionEn={getCurrentValue(currentBusiness.id, "description_en", currentBusiness.description_en) || ""}
                        descriptionAr={getCurrentValue(currentBusiness.id, "description_ar", currentBusiness.description_ar) || ""}
                        onHookChange={(lang, v) => handleFieldChange(currentBusiness.id, `hook_${lang}`, v)}
                        onDescriptionChange={(lang, v) => handleFieldChange(currentBusiness.id, lang === "fr" ? "description" : `description_${lang}`, v)}
                      />
                    </TabsContent>

                    {/* Blocks Tab */}
                    <TabsContent value="blocks">
                      <AffiliateHighlightsEditor businessId={currentBusiness.id} />
                    </TabsContent>

                    <TabsContent value="services">
                      <AffiliateServicesEditor businessId={currentBusiness.id} />
                    </TabsContent>

                    <TabsContent value="promotions">
                      {affiliateId && <AffiliatePromotionsEditor businessId={currentBusiness.id} affiliateId={affiliateId} />}
                    </TabsContent>

                    {/* Images Tab */}
                    <TabsContent value="images">
                      <AffiliateImagesEditor businessId={currentBusiness.id} />
                    </TabsContent>

                    {/* Videos Tab */}
                    <TabsContent value="videos">
                      <AffiliateVideosEditor businessId={currentBusiness.id} />
                    </TabsContent>

                    {/* Platform Help Tab */}
                    <TabsContent value="help">
                      <AffiliatePlatformHelp />
                    </TabsContent>


                    {/* Yext Tab */}
                    <TabsContent value="yext">
                      <AffiliateYextInfo businessId={currentBusiness.id} businessName={currentBusiness.name} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AffiliatePresence;
