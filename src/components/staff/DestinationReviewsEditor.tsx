import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare } from "lucide-react";
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
  published_at: string | null;
  is_default: boolean;
  is_hidden: boolean;
}

interface DestinationReviewsEditorProps {
  destinationId: string;
}

const DestinationReviewsEditor = ({ destinationId }: DestinationReviewsEditorProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("destination_reviews" as any)
      .select("id, source, author_name, rating, text, language, relative_time, published_at, is_default, is_hidden")
      .eq("destination_id", destinationId)
      .order("is_default", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false }) as any;
    setReviews((data || []) as Review[]);
    setLoading(false);
  }, [destinationId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase.from("destination_reviews" as any).delete().eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Avis supprimé");
    load();
  };

  const handleSetDefault = async (reviewId: string, value: boolean) => {
    if (value) {
      const currentDefault = reviews.find(r => r.is_default);
      if (currentDefault) {
        await supabase.from("destination_reviews" as any).update({ is_default: false } as any).eq("id", currentDefault.id);
      }
    }
    const { error } = await supabase.from("destination_reviews" as any).update({ is_default: value } as any).eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(value ? "Avis défini comme défaut" : "Avis retiré du défaut");
    load();
  };

  const handleToggleHidden = async (reviewId: string, value: boolean) => {
    const { error } = await supabase.from("destination_reviews" as any).update({ is_hidden: value } as any).eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(value ? "Avis masqué" : "Avis visible");
    load();
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-2">Chargement des avis…</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Aucun avis client enregistré. Cliquez sur « Extraire GPS & avis » pour récupérer les avis depuis Google.
      </div>
    );
  }

  const defaultReview = reviews.find(r => r.is_default);
  const otherReviews = reviews.filter(r => !r.is_default);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{reviews.length} avis enregistré{reviews.length > 1 ? "s" : ""}</p>

      {/* AVIS PAR DÉFAUT - Mis en avant */}
      {defaultReview && (
        <div className="p-4 rounded-lg border-2 border-primary bg-primary/10 ring-1 ring-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Avis mis en avant</span>
          </div>
          <p className="text-sm font-medium mb-2 leading-relaxed">
            {defaultReview.text || "Aucun texte"}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium">{defaultReview.author_name || "Anonyme"}</span>
            {defaultReview.rating != null && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {defaultReview.rating}/5
              </span>
            )}
            {defaultReview.published_at && (
              <span>{new Date(defaultReview.published_at).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        </div>
      )}

      {/* Liste des autres avis */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {otherReviews.map(review => (
          <div key={review.id} className="flex gap-3 p-3 rounded-lg border border-border bg-card text-sm group">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{review.author_name || "Anonyme"}</span>
                {review.rating != null && (
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {review.rating}/5
                  </span>
                )}
                {review.published_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                {!review.published_at && review.relative_time && (
                  <span className="text-xs text-muted-foreground">{review.relative_time}</span>
                )}
                {review.language && (
                  <span className="text-[10px] uppercase text-muted-foreground">{review.language}</span>
                )}
              </div>
              {review.text && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{review.text}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5" title="Ne pas afficher">
                <span className="text-[10px] text-muted-foreground">Masquer</span>
                <Switch
                  checked={review.is_hidden}
                  onCheckedChange={(v) => handleToggleHidden(review.id, v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center gap-1.5" title="Avis par défaut">
                <span className="text-[10px] text-muted-foreground">Défaut</span>
                <Switch
                  checked={review.is_default}
                  onCheckedChange={(v) => handleSetDefault(review.id, v)}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DestinationReviewsEditor;
