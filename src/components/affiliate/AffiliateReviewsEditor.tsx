import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Star, ExternalLink, Trash2, MapPin, Globe, MessageSquare, Quote } from "lucide-react";
import {
  collectRatingSources,
  computeWeightedRatingOn20,
  getTotalReviewCount,
} from "@/lib/ratingUtils";
import ReviewsEditor from "@/components/staff/ReviewsEditor";
import ReviewExcerptDialog from "@/components/affiliate/ReviewExcerptDialog";

export interface ReviewsData {
  google_reviews_url?: string | null;
  google_rating?: number | string | null;
  google_review_count?: number | string | null;
  tripadvisor_review_url?: string | null;
  tripadvisor_rating?: number | string | null;
  tripadvisor_review_count?: number | string | null;
  restaurant_guru_url?: string | null;
  restaurant_guru_rating?: number | string | null;
  restaurant_guru_review_count?: number | string | null;
  getyourguide_url?: string | null;
  getyourguide_rating?: number | string | null;
  getyourguide_review_count?: number | string | null;
  viator_url?: string | null;
  viator_rating?: number | string | null;
  viator_review_count?: number | string | null;
  tourradar_url?: string | null;
  tourradar_rating?: number | string | null;
  tourradar_review_count?: number | string | null;
  avis_verifies_url?: string | null;
  avis_verifies_rating?: number | string | null;
  avis_verifies_review_count?: number | string | null;
  trustpilot_url?: string | null;
  trustpilot_rating?: number | string | null;
  trustpilot_review_count?: number | string | null;
  kayak_url?: string | null;
  kayak_rating?: number | string | null;
  kayak_review_count?: number | string | null;
}

interface Props {
  businessId: string;
  data: ReviewsData;
  onFieldChange: (field: string, value: any) => void;
  onDataRefreshed: (patch: Record<string, any>) => void;
}

const PLATFORMS: Array<{ urlKey: keyof ReviewsData; ratingKey: keyof ReviewsData; countKey: keyof ReviewsData; label: string }> = [
  { urlKey: "google_reviews_url",     ratingKey: "google_rating",          countKey: "google_review_count",          label: "Google" },
  { urlKey: "tripadvisor_review_url", ratingKey: "tripadvisor_rating",     countKey: "tripadvisor_review_count",     label: "TripAdvisor" },
  { urlKey: "restaurant_guru_url",    ratingKey: "restaurant_guru_rating", countKey: "restaurant_guru_review_count", label: "Restaurant Guru" },
  { urlKey: "getyourguide_url",       ratingKey: "getyourguide_rating",    countKey: "getyourguide_review_count",    label: "GetYourGuide" },
  { urlKey: "viator_url",             ratingKey: "viator_rating",          countKey: "viator_review_count",          label: "Viator" },
  { urlKey: "tourradar_url",          ratingKey: "tourradar_rating",       countKey: "tourradar_review_count",       label: "TourRadar" },
  { urlKey: "avis_verifies_url",      ratingKey: "avis_verifies_rating",   countKey: "avis_verifies_review_count",   label: "Avis Vérifiés" },
  { urlKey: "trustpilot_url",         ratingKey: "trustpilot_rating",      countKey: "trustpilot_review_count",      label: "Trustpilot" },
  { urlKey: "kayak_url",              ratingKey: "kayak_rating",           countKey: "kayak_review_count",           label: "Kayak" },
];

const NUMERIC_KEYS = PLATFORMS.flatMap(p => [p.ratingKey, p.countKey]) as string[];
const URL_KEYS = PLATFORMS.map(p => p.urlKey) as string[];

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeAvg(data: ReviewsData): { avg: number | null; total: number } {
  const sources = collectRatingSources({
    google_rating: toNum(data.google_rating),
    google_review_count: toNum(data.google_review_count),
    tripadvisor_rating: toNum(data.tripadvisor_rating),
    tripadvisor_review_count: toNum(data.tripadvisor_review_count),
    restaurant_guru_rating: toNum(data.restaurant_guru_rating),
    restaurant_guru_review_count: toNum(data.restaurant_guru_review_count),
    getyourguide_rating: toNum(data.getyourguide_rating),
    getyourguide_review_count: toNum(data.getyourguide_review_count),
    viator_rating: toNum(data.viator_rating),
    viator_review_count: toNum(data.viator_review_count),
    tourradar_rating: toNum(data.tourradar_rating),
    tourradar_review_count: toNum(data.tourradar_review_count),
    avis_verifies_rating: toNum(data.avis_verifies_rating),
    avis_verifies_review_count: toNum(data.avis_verifies_review_count),
    trustpilot_rating: toNum(data.trustpilot_rating),
    trustpilot_review_count: toNum(data.trustpilot_review_count),
    kayak_rating: toNum(data.kayak_rating),
    kayak_review_count: toNum(data.kayak_review_count),
  });
  const avg = computeWeightedRatingOn20(sources);
  const total = getTotalReviewCount({
    google_review_count: toNum(data.google_review_count) ?? 0,
    tripadvisor_review_count: toNum(data.tripadvisor_review_count) ?? 0,
    restaurant_guru_review_count: toNum(data.restaurant_guru_review_count) ?? 0,
    getyourguide_review_count: toNum(data.getyourguide_review_count) ?? 0,
    viator_review_count: toNum(data.viator_review_count) ?? 0,
    tourradar_review_count: toNum(data.tourradar_review_count) ?? 0,
    avis_verifies_review_count: toNum(data.avis_verifies_review_count) ?? 0,
    trustpilot_review_count: toNum(data.trustpilot_review_count) ?? 0,
    kayak_review_count: toNum(data.kayak_review_count) ?? 0,
  });
  return { avg, total };
}

const AffiliateReviewsEditor = ({ businessId, data, onFieldChange, onDataRefreshed }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [excerptOpen, setExcerptOpen] = useState(false);

  const { avg, total } = computeAvg(data);

  const handleFetch = async () => {
    setLoading(true);
    try {
      // Persist current URLs so the edge function reads the latest values.
      const urlPatch: Record<string, any> = {};
      URL_KEYS.forEach(k => { urlPatch[k] = (data as any)[k] || null; });
      await supabase.from("businesses").update(urlPatch).eq("id", businessId);

      const { data: res, error } = await supabase.functions.invoke("fetch-reviews", {
        body: { business_id: businessId },
      });
      if (error) throw new Error(error.message);
      if (!res?.success) throw new Error(res?.error || "Impossible de récupérer les avis");

      const fetched = (res.data || {}) as Record<string, any>;
      const patch: Record<string, any> = {};
      for (const k of NUMERIC_KEYS) {
        if (fetched[k] !== undefined) {
          patch[k] = fetched[k] === null ? null : Number(fetched[k]);
        }
      }
      for (const k of URL_KEYS) {
        if (fetched[k] !== undefined) patch[k] = fetched[k];
      }

      const merged: ReviewsData = { ...data, ...patch };
      const { avg: newAvg, total: newTotal } = computeAvg(merged);

      const dbUpdate = { ...patch, computed_rating: newAvg, total_review_count: newTotal };
      const { error: saveError } = await supabase.from("businesses").update(dbUpdate).eq("id", businessId);
      if (saveError) throw saveError;

      onDataRefreshed(patch);
      toast({
        title: "Avis récupérés",
        description: newAvg !== null
          ? `Note calculée : ${newAvg}/20 (${newTotal} avis)`
          : `Aucune note récupérée (${newTotal} avis)`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList>
        <TabsTrigger value="details" className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Détails
        </TabsTrigger>
        <TabsTrigger value="urls" className="gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Urls
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            {avg !== null ? (
              <span className="flex items-center gap-1.5 text-amber-500 font-semibold text-sm">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                Note calculée : {avg}/20 <span className="text-muted-foreground font-normal">({total} avis)</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Aucune note calculée</span>
            )}
          </div>
          <Button type="button" size="sm" onClick={handleFetch} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Récupérer les avis &amp; sauvegarder
          </Button>
        </div>

        <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Détail des avis clients
            </Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setExcerptOpen(true)}>
              <Quote className="h-3.5 w-3.5 mr-1" /> Extrait par défaut
            </Button>
          </div>
          <ReviewsEditor businessId={businessId} />
        </div>

        {excerptOpen && (
          <ReviewExcerptDialog businessId={businessId} onClose={() => setExcerptOpen(false)} />
        )}
      </TabsContent>


      <TabsContent value="urls" className="mt-0 space-y-4">


        <div className="grid grid-cols-1 gap-3">
          {PLATFORMS.map(({ urlKey, ratingKey, countKey, label }) => {
            const url = (data as any)[urlKey] ?? "";
            const rating = (data as any)[ratingKey] ?? "";
            const count = (data as any)[countKey] ?? "";
            return (
              <div key={urlKey} className="p-3 rounded-lg border border-border bg-card space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  {label === "Google" ? <MapPin className="h-3.5 w-3.5 text-blue-500" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                  {label}
                </Label>
                <div className="flex gap-1">
                  <Input
                    value={url}
                    onChange={(e) => onFieldChange(urlKey as string, e.target.value)}
                    placeholder="URL avis"
                    className="text-xs flex-1"
                  />
                  {url && (
                    <>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          onFieldChange(urlKey as string, "");
                          onFieldChange(ratingKey as string, "");
                          onFieldChange(countKey as string, "");
                        }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input type="number" step="0.1" min="0" max="5"
                    value={rating}
                    onChange={(e) => onFieldChange(ratingKey as string, e.target.value)}
                    placeholder="Note /5" className="w-20 text-xs" />
                  <Input type="number" min="0"
                    value={count}
                    onChange={(e) => onFieldChange(countKey as string, e.target.value)}
                    placeholder="Nb avis" className="w-24 text-xs" />
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default AffiliateReviewsEditor;
