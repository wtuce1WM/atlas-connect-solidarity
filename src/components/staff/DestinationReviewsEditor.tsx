import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      .select("id, source, author_name, rating, text, language, relative_time, published_at")
      .eq("destination_id", destinationId)
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

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{reviews.length} avis enregistré{reviews.length > 1 ? "s" : ""}</p>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {reviews.map(review => (
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
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => handleDelete(review.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DestinationReviewsEditor;
