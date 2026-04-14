import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Review {
  id: string;
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  language: string | null;
  relative_time: string | null;
  is_default: boolean;
}

interface ReviewsEditorProps {
  businessId: string;
}

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  tripadvisor: "TripAdvisor",
  restaurant_guru: "Restaurant Guru",
};

const ReviewsEditor = ({ businessId }: ReviewsEditorProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, source, author_name, rating, text, language, relative_time, is_default")
      .eq("business_id", businessId)
      .order("is_default", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false });
    setReviews((data as unknown as Review[]) || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const handleSetDefault = async (reviewId: string, value: boolean) => {
    if (value) {
      // Unset any existing default for this business
      const currentDefault = reviews.find(r => r.is_default);
      if (currentDefault) {
        await supabase.from("reviews").update({ is_default: false } as any).eq("id", currentDefault.id);
      }
    }
    const { error } = await supabase.from("reviews").update({ is_default: value } as any).eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(value ? "Avis défini comme défaut" : "Avis retiré du défaut");
    load();
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Avis supprimé");
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-2">Chargement des avis…</div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Aucun avis client enregistré
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{reviews.length} avis enregistré{reviews.length > 1 ? "s" : ""}</p>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {reviews.map(review => (
          <div
            key={review.id}
            className={`flex gap-3 p-3 rounded-lg border text-sm ${
              review.is_default
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card"
            }`}
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{review.author_name || "Anonyme"}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {SOURCE_LABELS[review.source] || review.source}
                </span>
                {review.rating != null && (
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {review.rating}/5
                  </span>
                )}
                {review.relative_time && (
                  <span className="text-xs text-muted-foreground">{review.relative_time}</span>
                )}
                {review.language && (
                  <span className="text-[10px] uppercase text-muted-foreground">{review.language}</span>
                )}
              </div>
              {review.text && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {review.text}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5" title="Avis par défaut">
                <span className="text-[10px] text-muted-foreground">Défaut</span>
                <Switch
                  checked={review.is_default}
                  onCheckedChange={(v) => handleSetDefault(review.id, v)}
                  className="scale-75"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleDelete(review.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsEditor;
