import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Loader2, ArrowLeft, Globe, CheckCircle2, AlertCircle, ExternalLink,
  Save, Facebook, Instagram, Youtube, MapPin, Star, Building2
} from "lucide-react";
import { InstagramIcon, TikTokIcon, PinterestIcon } from "@/components/staff/SocialMediaIcons";

// Platform definitions with field keys from businesses table
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

interface BusinessPresence {
  id: string;
  name: string;
  city: string | null;
  main_category: string | null;
  logo_url: string | null;
  links: Record<PlatformKey, string | null>;
}

const AffiliatePresence = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessPresence[]>([]);
  const [editedLinks, setEditedLinks] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/affiliates"); return; }

      // Get affiliate record for this user
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

      // Get businesses for this affiliate
      const selectFields = ["id", "name", "city", "main_category", "logo_url",
        ...PLATFORMS.map(p => p.key)].join(",");

      const { data: biz } = await supabase
        .from("businesses")
        .select(selectFields)
        .eq("affiliate_id", affiliate.id)
        .eq("is_active", true)
        .order("name");

      const mapped: BusinessPresence[] = (biz || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        main_category: b.main_category,
        logo_url: b.logo_url,
        links: Object.fromEntries(PLATFORMS.map(p => [p.key, b[p.key] || null])) as Record<PlatformKey, string | null>,
      }));

      setBusinesses(mapped);
      if (mapped.length > 0) setSelectedBusiness(mapped[0].id);
      setIsLoading(false);
    };
    load();
  }, [navigate, toast]);

  // Audit stats
  const auditStats = useMemo(() => {
    const total = businesses.length * PLATFORMS.length;
    let filled = 0;
    businesses.forEach(b => {
      PLATFORMS.forEach(p => { if (b.links[p.key]) filled++; });
    });
    return { total, filled, missing: total - filled, percent: total > 0 ? Math.round((filled / total) * 100) : 0 };
  }, [businesses]);

  const getBusinessCompleteness = (b: BusinessPresence) => {
    const filled = PLATFORMS.filter(p => b.links[p.key]).length;
    return { filled, total: PLATFORMS.length, percent: Math.round((filled / PLATFORMS.length) * 100) };
  };

  const handleLinkChange = (businessId: string, key: string, value: string) => {
    setEditedLinks(prev => ({
      ...prev,
      [businessId]: { ...prev[businessId], [key]: value },
    }));
  };

  const handleSave = async (businessId: string) => {
    const edits = editedLinks[businessId];
    if (!edits || Object.keys(edits).length === 0) return;

    setSavingId(businessId);
    const { error } = await supabase
      .from("businesses")
      .update(edits)
      .eq("id", businessId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      // Update local state
      setBusinesses(prev => prev.map(b => {
        if (b.id !== businessId) return b;
        const newLinks = { ...b.links };
        Object.entries(edits).forEach(([k, v]) => { (newLinks as any)[k] = v || null; });
        return { ...b, links: newLinks };
      }));
      setEditedLinks(prev => { const n = { ...prev }; delete n[businessId]; return n; });
      toast({ title: "Liens mis à jour avec succès ✓" });
    }
    setSavingId(null);
  };

  const currentBusiness = businesses.find(b => b.id === selectedBusiness);
  const hasEdits = selectedBusiness ? Object.keys(editedLinks[selectedBusiness] || {}).length > 0 : false;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-7xl">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/affiliates/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Présence en ligne</h1>
            <p className="text-sm text-muted-foreground">Gérez les profils sociaux de vos établissements</p>
          </div>
        </div>

        {/* Global Audit Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-foreground">{businesses.length}</p>
              <p className="text-xs text-muted-foreground">Établissements</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-emerald-500">{auditStats.filled}</p>
              <p className="text-xs text-muted-foreground">Profils renseignés</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-orange-500">{auditStats.missing}</p>
              <p className="text-xs text-muted-foreground">Profils manquants</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-primary">{auditStats.percent}%</p>
              <p className="text-xs text-muted-foreground">Complétude</p>
            </CardContent>
          </Card>
        </div>

        {businesses.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun établissement associé à votre compte.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Business List Sidebar */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Vos établissements
              </p>
              {businesses.map(b => {
                const comp = getBusinessCompleteness(b);
                const isSelected = b.id === selectedBusiness;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBusiness(b.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-white" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.city || "—"}</p>
                      </div>
                      <Badge
                        variant={comp.percent === 100 ? "default" : comp.percent > 50 ? "secondary" : "destructive"}
                        className="text-[10px] shrink-0"
                      >
                        {comp.percent}%
                      </Badge>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          comp.percent === 100 ? "bg-emerald-500" : comp.percent > 50 ? "bg-primary" : "bg-orange-500"
                        }`}
                        style={{ width: `${comp.percent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Platform Links Editor */}
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
                </CardHeader>
                <CardContent className="space-y-3">
                  {PLATFORMS.map(platform => {
                    const currentValue = editedLinks[currentBusiness.id]?.[platform.key]
                      ?? currentBusiness.links[platform.key]
                      ?? "";
                    const originalValue = currentBusiness.links[platform.key] || "";
                    const isFilled = !!currentValue;
                    const isEdited = editedLinks[currentBusiness.id]?.[platform.key] !== undefined;

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
                            onChange={(e) => handleLinkChange(currentBusiness.id, platform.key, e.target.value)}
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
