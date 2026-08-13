import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { verifySession } from "@/hooks/useAuthSession";
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
  Loader2, Globe, CheckCircle2, AlertCircle, ExternalLink,
  Save, Facebook, Instagram, Youtube, MapPin, Star, Building2, Phone, Clock, HelpCircle, MessageSquare, FileText, Sparkles, ImageIcon, Video, Plus, Tag, Wrench, Wand2, BarChart3, LogOut, Globe2, Newspaper, Scale, Bot, Music2, AudioLines
} from "lucide-react";
import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";
import SubstackIcon from "@/components/icons/SubstackIcon";
import { type OpeningHours } from "@/components/staff/OpeningHoursEditor";
import AffiliateOpeningHoursEditor from "@/components/affiliate/AffiliateOpeningHoursEditor";
import AffiliateContactEditor, { type CityOption, type NeighborhoodOption, type CtaUrlItem } from "@/components/affiliate/AffiliateContactEditor";
import AffiliatePlatformHelp from "@/components/affiliate/AffiliatePlatformHelp";
import AffiliateLegalTab from "@/components/affiliate/AffiliateLegalTab";
import AffiliateReviewsEditor, { type ReviewsData } from "@/components/affiliate/AffiliateReviewsEditor";
import AffiliateTextEditor from "@/components/affiliate/AffiliateTextEditor";
import AffiliateAiTextsEditor from "@/components/affiliate/AffiliateAiTextsEditor";
import AffiliateAgentIaEditor from "@/components/affiliate/AffiliateAgentIaEditor";
import AffiliateMapEditor from "@/components/affiliate/AffiliateMapEditor";
import AffiliateCtasEditor from "@/components/affiliate/AffiliateCtasEditor";
import AffiliatePrivateNoteDialog from "@/components/affiliate/AffiliatePrivateNoteDialog";


import AffiliateHighlightsEditor from "@/components/affiliate/AffiliateHighlightsEditor";
import AffiliatePromotionsEditor from "@/components/affiliate/AffiliatePromotionsEditor";
import AffiliateServicesEditor from "@/components/affiliate/AffiliateServicesEditor";
import AffiliateImagesEditor from "@/components/affiliate/AffiliateImagesEditor";
import AffiliateVideosEditor from "@/components/affiliate/AffiliateVideosEditor";
import AffiliateExternalDocsEditor from "@/components/affiliate/AffiliateExternalDocsEditor";
import AffiliateToolsTab from "@/components/affiliate/AffiliateToolsTab";
import AffiliatePublishedWidgetsPanel from "@/components/affiliate/AffiliatePublishedWidgetsPanel";
import AffiliateNewsTab from "@/components/affiliate/AffiliateNewsTab";
import AffiliateShowcaseSiteEditor from "@/components/affiliate/AffiliateShowcaseSiteEditor";
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
  { key: "spotify_url", label: "Spotify", icon: <Music2 className="h-4 w-4" />, color: "text-green-500" },
  { key: "soundcloud_url", label: "SoundCloud", icon: <AudioLines className="h-4 w-4" />, color: "text-orange-500" },
  { key: "substack_url", label: "Substack", icon: <SubstackIcon className="h-4 w-4" />, color: "text-[#FF6719]" },
  { key: "website", label: "Site web", icon: <Globe className="h-4 w-4" />, color: "text-emerald-500" },
  { key: "tripadvisor_url", label: "TripAdvisor", icon: <Globe className="h-4 w-4" />, color: "text-green-600" },
  { key: "booking_url", label: "Booking.com", icon: <Globe className="h-4 w-4" />, color: "text-blue-800" },
  { key: "restaurant_guru_url", label: "Restaurant Guru", icon: <Globe className="h-4 w-4" />, color: "text-orange-500" },
  { key: "tripadvisor_review_url", label: "TripAdvisor Reviews", icon: <Star className="h-4 w-4" />, color: "text-green-600" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["key"];

// Affichage uniquement : masque les lignes "Reviews" et place "Site web" en tête.
const HIDDEN_PLATFORM_KEYS: string[] = ["google_reviews_url", "tripadvisor_review_url"];
const VISIBLE_PLATFORMS = [
  ...PLATFORMS.filter(p => p.key === "website"),
  ...PLATFORMS.filter(p => p.key !== "website" && !HIDDEN_PLATFORM_KEYS.includes(p.key)),
];

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
  slug: string | null;
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
  name_en: string | null;
  name_ar: string | null;
  carousel_badge: string | null;
  poi_business_style: string | null;
  affiliate_private_note: string | null;
  is_active: boolean;
}


const AffiliatePresence = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessPresence[]>([]);
  const [editedFields, setEditedFields] = useState<Record<string, Record<string, any>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [pendingBusinessId, setPendingBusinessId] = useState<string | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [affiliateName, setAffiliateName] = useState<string>("");
  const [maxBusinesses, setMaxBusinesses] = useState<number | null>(null);
  const [hasDashboard, setHasDashboard] = useState(false);
  const [hasVideoStudio, setHasVideoStudio] = useState(false);
  const [hasShowcaseSite, setHasShowcaseSite] = useState(false);
  const [hasCustomDomain, setHasCustomDomain] = useState(false);
  const [featureRights, setFeatureRights] = useState<Record<string, { has_ai_assistant: boolean; has_blog_export: boolean; has_nearby_widget: boolean; has_email_signature: boolean; has_showcase_site: boolean }>>({});
  const [activeTab, setActiveTab] = useState("news");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const canCreateMore = maxBusinesses == null || businesses.length < maxBusinesses;
  const limitLabel = maxBusinesses != null
    ? `${businesses.length}/${maxBusinesses} établissement${maxBusinesses > 1 ? "s" : ""}`
    : null;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1" && canCreateMore) {
      setIsCreateDialogOpen(true);
      params.delete("new");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.search, canCreateMore]);


  const loadBusinesses = async (targetAffiliateId: string) => {
    const selectFields = ["id", "name", "slug", "name_en", "name_ar", "city", "main_category", "logo_url", "phone", "whatsapp", "email",
      "address", "neighborhood", "latitude", "longitude", "opening_hours",
      "show_opening_hours", "closure_message", "vacation_dates",
      "hook_fr", "hook_en", "hook_ar", "description", "description_fr", "description_en", "description_ar",
      "is_active", "carousel_badge", "poi_business_style",
      ...PLATFORMS.map(p => p.key),
      ...CTA_EXTRA_FIELDS,
      ...REVIEW_FIELDS].join(",");

    const [{ data: biz }, { data: citiesData }, { data: neighborhoodsData }] = await Promise.all([
      supabase.from("businesses").select(selectFields).eq("affiliate_id", targetAffiliateId).order("name"),
      supabase.from("cities").select("id, name_fr, region").order("name_fr"),
      supabase.from("neighborhoods").select("id, name, city_id").order("name"),
    ]);
    setCities((citiesData as CityOption[]) || []);
    setNeighborhoods((neighborhoodsData as NeighborhoodOption[]) || []);

    // Notes privées : table dédiée (jamais exposée publiquement).
    const businessIds = ((biz as any[]) || []).map((b: any) => b.id);
    const notesById: Record<string, string | null> = {};
    if (businessIds.length > 0) {
      const { data: notesData } = await supabase
        .from("business_affiliate_notes")
        .select("business_id, note")
        .in("business_id", businessIds);
      for (const n of (notesData ?? []) as Array<{ business_id: string; note: string | null }>) {
        notesById[n.business_id] = n.note;
      }
    }

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
        slug: b.slug ?? null,
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
        description: b.description ?? b.description_fr ?? null,
        description_en: b.description_en ?? null,
        description_ar: b.description_ar ?? null,
        name_en: b.name_en ?? null,
        name_ar: b.name_ar ?? null,
        carousel_badge: b.carousel_badge ?? null,
        poi_business_style: b.poi_business_style ?? null,
        affiliate_private_note: notesById[b.id] ?? null,
        is_active: b.is_active ?? true,

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
      const { user } = await verifySession();
      if (!user) { navigate("/affiliates"); return; }

      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id, name, max_businesses, has_dashboard, has_video_studio, has_showcase_site, has_custom_domain")
        .eq("user_id", user.id)
        .maybeSingle();


      if (!affiliate) {
        setIsLoading(false);
        return;
      }

      setAffiliateId(affiliate.id);
      setAffiliateName((affiliate as any).name ?? "");
      setMaxBusinesses((affiliate as any).max_businesses ?? null);
      setHasDashboard(!!(affiliate as any).has_dashboard);
      setHasVideoStudio(!!(affiliate as any).has_video_studio);
      setHasShowcaseSite(!!(affiliate as any).has_showcase_site);
      setHasCustomDomain(!!(affiliate as any).has_custom_domain);


      const { data: rightsRows } = await supabase
        .from("business_feature_rights")
        .select("business_id, has_ai_assistant, has_blog_export, has_nearby_widget, has_email_signature, has_showcase_site");
      const map: Record<string, { has_ai_assistant: boolean; has_blog_export: boolean; has_nearby_widget: boolean; has_email_signature: boolean; has_showcase_site: boolean }> = {};
      ((rightsRows as any[]) || []).forEach((r) => {
        map[r.business_id] = {
          has_ai_assistant: !!r.has_ai_assistant,
          has_blog_export: !!r.has_blog_export,
          has_nearby_widget: !!r.has_nearby_widget,
          has_email_signature: r.has_email_signature !== false,
          has_showcase_site: !!r.has_showcase_site,
        };
      });
      setFeatureRights(map);

      await loadBusinesses(affiliate.id);
    };
    init();
  }, [navigate, toast]);

  const getBusinessCompleteness = (b: BusinessPresence) => {
    const filled = VISIBLE_PLATFORMS.filter(p => b.links[p.key]).length;
    return { filled, total: VISIBLE_PLATFORMS.length, percent: Math.round((filled / VISIBLE_PLATFORMS.length) * 100) };
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
    // Pour les établissements, la description FR canonique (front public, IA) est
    // `description` — celle éditée en back-office. On synchronise `description_fr`
    // pour compatibilité avec les anciens usages.
    if ("description" in payload) {
      payload.description_fr = payload.description;
    }

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
    if (!canCreateMore) {
      toast({
        title: "Limite atteinte",
        description: `Votre forfait autorise ${maxBusinesses} établissement${(maxBusinesses ?? 0) > 1 ? "s" : ""}. Contactez-nous pour augmenter cette limite.`,
        variant: "destructive",
      });
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/affiliates");
  };

  const currentBusiness = businesses.find(b => b.id === selectedBusiness);

  const normalizeForCompare = (v: any) => {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const hasEdits = (() => {
    if (!selectedBusiness || !currentBusiness) return false;
    const edits = editedFields[selectedBusiness] || {};
    return Object.entries(edits).some(([key, value]) => {
      const original = (currentBusiness as any)[key] ?? (currentBusiness as any).links?.[key];
      return normalizeForCompare(value) !== normalizeForCompare(original);
    });
  })();

  const requestSelectBusiness = (id: string) => {
    if (id === selectedBusiness) return;
    if (hasEdits) {
      setPendingBusinessId(id);
      return;
    }
    setSelectedBusiness(id);
  };

  const discardAndSwitch = () => {
    if (!pendingBusinessId) return;
    if (selectedBusiness) {
      setEditedFields(prev => { const n = { ...prev }; delete n[selectedBusiness]; return n; });
    }
    setSelectedBusiness(pendingBusinessId);
    setPendingBusinessId(null);
  };

  const saveAndSwitch = async () => {
    if (!pendingBusinessId || !selectedBusiness) return;
    const target = pendingBusinessId;
    await handleSave(selectedBusiness);
    setSelectedBusiness(target);
    setPendingBusinessId(null);
  };

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
      <HomeMindtripHeader
        alwaysWhite
        customLinks={[
          { label: "Présence en ligne", to: "/affiliates/presence" },
          ...(hasDashboard ? [{ label: "Tableau de bord", to: "/affiliates/dashboard" }] : []),
          ...(hasVideoStudio ? [{ label: "Studio vidéo", to: "/studio-video" }] : []),
          ...(canCreateMore ? [{ label: "Nouvel établissement", onClick: () => setIsCreateDialogOpen(true) }] : []),
          { label: "Se déconnecter", onClick: handleSignOut, danger: true },
        ]}
      />
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Présence en ligne</h1>
        </div>

        <Dialog open={!!pendingBusinessId} onOpenChange={(o) => { if (!o) setPendingBusinessId(null); }}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Modifications non enregistrées</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Vous avez des modifications non enregistrées sur{" "}
                <span className="text-foreground font-medium">{currentBusiness?.name}</span>. Voulez-vous
                les enregistrer avant de changer d'établissement ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-wrap">
              <Button variant="ghost" onClick={() => setPendingBusinessId(null)}>Annuler</Button>
              <Button variant="outline" onClick={discardAndSwitch}>Ne pas enregistrer</Button>
              <Button onClick={saveAndSwitch} disabled={savingId === selectedBusiness}>
                {savingId === selectedBusiness ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Créer un nouvel établissement</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Saisissez le nom de l'établissement. Vous pourrez compléter les onglets (Texte, Contact, Horaires, Images, etc.) juste après.
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


        {businesses.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun établissement associé à votre compte.</p>
              {canCreateMore ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Créer mon premier établissement
                </Button>
              ) : (
                <p className="text-sm text-orange-400">
                  Votre forfait n'autorise aucun établissement. Contactez-nous pour l'activer.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Business horizontal strip */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-white uppercase tracking-wider">
                      Vos établissements
                    </p>
                    {limitLabel && (
                      <span className="text-[11px] text-white/60 normal-case tracking-normal">({limitLabel})</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canCreateMore}
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="border-white/20 bg-white text-black hover:bg-white/10 hover:text-white w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canCreateMore ? `Limite atteinte (${limitLabel})` : undefined}
                  >
                    <Plus className="h-4 w-4 mr-1 text-black" />
                    {canCreateMore ? "Nouvel établissement" : `Limite atteinte (${limitLabel})`}
                  </Button>
                </div>


              <HScroll className="flex gap-3 pb-3 -mb-1 overflow-x-auto">
                {[...businesses]
                  .sort((a, b) => (a.name || "").localeCompare(b.name || "", "fr", { sensitivity: "base" }))
                  .map(b => {
                  const isSelected = b.id === selectedBusiness;
                  return (
                    <button
                      key={b.id}
                      onClick={() => requestSelectBusiness(b.id)}
                      className={`shrink-0 text-left p-3 rounded-lg border transition-colors w-[168px] h-[168px] flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className={`text-sm font-medium leading-snug break-words ${isSelected ? "text-white" : "text-foreground"}`}>{b.name}</p>
                      <div className="flex items-end justify-between gap-2">
                        <p className={`text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>{b.city || "—"}</p>
                        {b.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                            Inactif
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </HScroll>

            </div>

            {/* Editor Panel */}
            {currentBusiness && (
              <Card className="bg-card border-border dark">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-3xl sm:text-4xl font-bold leading-tight">{currentBusiness.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getBusinessCompleteness(currentBusiness).filled}/{VISIBLE_PLATFORMS.length} plateformes configurées
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <AffiliatePrivateNoteDialog
                        businessId={currentBusiness.id}
                        initialNote={currentBusiness.affiliate_private_note}
                        onSaved={(note) => setBusinesses(prev => prev.map(b => b.id === currentBusiness.id ? { ...b, affiliate_private_note: note } : b))}
                      />
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
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
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-6 w-full flex items-center overflow-x-auto whitespace-nowrap justify-start gap-1 border-b border-white/10 bg-transparent p-0 h-auto scrollbar-hide">
                      <TabsTrigger value="news" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Newspaper className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">News</span>
                      </TabsTrigger>
                      <TabsTrigger value="tools" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Wand2 className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Tools</span>
                      </TabsTrigger>
                      <TabsTrigger value="text" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <FileText className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Texte</span>
                      </TabsTrigger>
                      <TabsTrigger value="blocks" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Sparkles className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Blocs</span>
                      </TabsTrigger>
                      <TabsTrigger value="images" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <ImageIcon className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Images</span>
                      </TabsTrigger>
                      <TabsTrigger value="videos" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Video className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Vidéos</span>
                      </TabsTrigger>

                      {!!featureRights[currentBusiness.id]?.has_ai_assistant && (
                        <TabsTrigger value="aitexts" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                          <Sparkles className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">TXT IA</span>
                        </TabsTrigger>
                      )}
                      {!!featureRights[currentBusiness.id]?.has_ai_assistant && (
                        <TabsTrigger value="agentia" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                          <Bot className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Agent IA</span>
                        </TabsTrigger>
                      )}

                      <TabsTrigger value="map" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <MapPin className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Map</span>
                      </TabsTrigger>



                      <TabsTrigger value="links" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Globe className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Liens</span>
                      </TabsTrigger>
                      <TabsTrigger value="ctas" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Tag className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">CTAs</span>
                      </TabsTrigger>

                      <TabsTrigger value="contact" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Phone className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Contact</span>
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <MessageSquare className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Avis Clients</span>
                      </TabsTrigger>
                      <TabsTrigger value="hours" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Clock className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Horaires</span>
                      </TabsTrigger>
                      <TabsTrigger value="services" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Wrench className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Services</span>
                      </TabsTrigger>
                      <TabsTrigger value="promotions" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Tag className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Offres</span>
                      </TabsTrigger>
                      <TabsTrigger value="help" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <HelpCircle className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Plateformes</span>
                      </TabsTrigger>
                      <TabsTrigger value="legal" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                        <Scale className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Juridique</span>
                      </TabsTrigger>

                      {hasShowcaseSite && (
                        <TabsTrigger value="showcase" className="group gap-2 shrink-0 px-4 py-3.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                          <Globe2 className="h-4 w-4 shrink-0 text-white/40 group-data-[state=active]:text-primary" /> <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Site vitrine</span>
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {/* Links Tab */}
                    <TabsContent value="links">
                      <Tabs defaultValue="web" className="w-full">
                        <TabsList className="mb-4 w-full flex flex-col items-stretch gap-1 border-b border-white/10 bg-transparent p-0 h-auto sm:flex-row sm:items-center sm:justify-start">
                          <TabsTrigger value="web" className="group w-full sm:w-auto shrink-0 px-4 py-2.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                            <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Web &amp; Socials</span>
                          </TabsTrigger>
                          <TabsTrigger value="externes" className="group w-full sm:w-auto shrink-0 px-4 py-2.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                            <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Externes</span>
                          </TabsTrigger>
                        </TabsList>


                        <TabsContent value="web" className="space-y-3">
                          {VISIBLE_PLATFORMS.map(platform => {
                            const currentValue = getCurrentValue(currentBusiness.id, platform.key, currentBusiness.links[platform.key]);
                            const isFilled = !!currentValue;
                            const isEdited = editedFields[currentBusiness.id]?.[platform.key] !== undefined;

                            return (
                              <div key={platform.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className={`shrink-0 ${platform.color}`}>
                                    {platform.icon}
                                  </div>
                                  <div className="sm:w-[130px] sm:shrink-0">
                                    <span className="text-sm font-medium text-foreground">{platform.label}</span>
                                  </div>
                                  <div className="shrink-0 sm:hidden">
                                    {isFilled ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-orange-400" />
                                    )}
                                  </div>
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
                                <div className="hidden shrink-0 sm:block">
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

                        <TabsContent value="externes">
                          <AffiliateExternalDocsEditor businessId={currentBusiness.id} />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>


                    {/* CTAs Tab */}
                    <TabsContent value="ctas">
                      <AffiliateCtasEditor
                        businessName={currentBusiness.name}
                        carouselBadge={getCurrentValue(currentBusiness.id, "carousel_badge", currentBusiness.carousel_badge) ?? ""}
                        poiBusinessStyle={getCurrentValue(currentBusiness.id, "poi_business_style", currentBusiness.poi_business_style) ?? ""}
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
                        onFieldChange={(field, value) => handleFieldChange(currentBusiness.id, field, value)}
                      />
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
                        ctaUrls={[]}
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

                    {/* News Tab */}
                    <TabsContent value="news">
                      <AffiliateNewsTab
                        businessName={currentBusiness.name}
                        businessId={currentBusiness.id}
                        affiliateName={affiliateName}
                        slug={currentBusiness.slug}
                        onGoToTools={() => setActiveTab("tools")}
                        rights={{
                          aiAssistant: !!featureRights[currentBusiness.id]?.has_ai_assistant,
                          blogExport: !!featureRights[currentBusiness.id]?.has_blog_export,
                          nearbyWidget: !!featureRights[currentBusiness.id]?.has_nearby_widget,
                          emailSignature: featureRights[currentBusiness.id]?.has_email_signature !== false,
                          dashboard: hasDashboard,
                          videoStudio: hasVideoStudio,
                          showcaseSite: !!featureRights[currentBusiness.id]?.has_showcase_site,
                          customDomain: hasCustomDomain,
                        }}
                      />
                    </TabsContent>

                    {/* Tools Tab */}
                    <TabsContent value="tools">
                      <Tabs defaultValue="widgets" className="w-full">
                        <TabsList className="mb-4 w-full flex flex-col items-stretch gap-1 border-b border-white/10 bg-transparent p-0 h-auto sm:flex-row sm:items-center sm:justify-start">
                          <TabsTrigger value="widgets" className="group w-full sm:w-auto shrink-0 px-4 py-2.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                            <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Widgets</span>
                          </TabsTrigger>
                          <TabsTrigger value="published" className="group w-full sm:w-auto shrink-0 px-4 py-2.5 border-b-2 border-transparent bg-transparent rounded-none shadow-none hover:bg-white/5 data-[state=active]:border-primary data-[state=active]:bg-white/5">
                            <span className="text-sm font-medium text-white/60 group-data-[state=active]:text-white group-data-[state=active]:font-semibold">Publiés</span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="widgets">
                          <AffiliateToolsTab
                            slug={currentBusiness.slug}
                            businessName={currentBusiness.name}
                            businessId={currentBusiness.id}
                            rights={{
                              aiAssistant: !!featureRights[currentBusiness.id]?.has_ai_assistant,
                              blogExport: !!featureRights[currentBusiness.id]?.has_blog_export,
                              nearbyWidget: !!featureRights[currentBusiness.id]?.has_nearby_widget,
                              emailSignature: featureRights[currentBusiness.id]?.has_email_signature !== false,
                            }}
                          />
                        </TabsContent>

                        <TabsContent value="published">
                          <AffiliatePublishedWidgetsPanel
                            key={currentBusiness.id}
                            businessId={currentBusiness.id}
                            slug={currentBusiness.slug}
                          />
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    {/* Text Tab */}
                    <TabsContent value="text">
                      <AffiliateTextEditor
                        key={currentBusiness.id}
                        nameFr={getCurrentValue(currentBusiness.id, "name", currentBusiness.name) || ""}
                        nameEn={getCurrentValue(currentBusiness.id, "name_en", currentBusiness.name_en) || ""}
                        nameAr={getCurrentValue(currentBusiness.id, "name_ar", currentBusiness.name_ar) || ""}
                        hookFr={getCurrentValue(currentBusiness.id, "hook_fr", currentBusiness.hook_fr) || ""}
                        hookEn={getCurrentValue(currentBusiness.id, "hook_en", currentBusiness.hook_en) || ""}
                        hookAr={getCurrentValue(currentBusiness.id, "hook_ar", currentBusiness.hook_ar) || ""}
                        descriptionFr={getCurrentValue(currentBusiness.id, "description", currentBusiness.description) || ""}
                        descriptionEn={getCurrentValue(currentBusiness.id, "description_en", currentBusiness.description_en) || ""}
                        descriptionAr={getCurrentValue(currentBusiness.id, "description_ar", currentBusiness.description_ar) || ""}
                        onNameChange={(lang, v) => handleFieldChange(currentBusiness.id, lang === "fr" ? "name" : `name_${lang}`, v)}
                        onHookChange={(lang, v) => handleFieldChange(currentBusiness.id, `hook_${lang}`, v)}
                        onDescriptionChange={(lang, v) => handleFieldChange(currentBusiness.id, lang === "fr" ? "description" : `description_${lang}`, v)}
                      />
                    </TabsContent>

                    {/* AI Texts Tab */}
                    {!!featureRights[currentBusiness.id]?.has_ai_assistant && (
                      <TabsContent value="aitexts">
                        <AffiliateAiTextsEditor key={currentBusiness.id} businessId={currentBusiness.id} />
                      </TabsContent>
                    )}

                    {!!featureRights[currentBusiness.id]?.has_ai_assistant && (
                      <TabsContent value="agentia">
                        <AffiliateAgentIaEditor
                          key={currentBusiness.id}
                          businessId={currentBusiness.id}
                          businessCity={(currentBusiness as any).city}
                          siblings={businesses.map((b) => ({ id: b.id, name: b.name }))}
                        />

                      </TabsContent>
                    )}

                    <TabsContent value="map">
                      <AffiliateMapEditor key={currentBusiness.id} businessId={currentBusiness.id} />
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

                    {/* Legal Tab */}
                    <TabsContent value="legal">
                      {affiliateId && <AffiliateLegalTab affiliateId={affiliateId} />}
                    </TabsContent>


                    {/* Showcase Site Tab */}
                    {hasShowcaseSite && (
                      <TabsContent value="showcase">
                        <AffiliateShowcaseSiteEditor businessId={currentBusiness.id} businessSlug={currentBusiness.slug} />
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <Footer variant="affiliate" />
    </div>
  );
};

export default AffiliatePresence;
