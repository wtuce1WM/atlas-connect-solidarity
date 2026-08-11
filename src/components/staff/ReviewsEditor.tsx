import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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

interface Review {
  id: string;
  source: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  text_fr: string | null;
  language: string | null;
  relative_time: string | null;
  published_at: string | null;
  is_default: boolean;
  is_hidden: boolean;
  highlight?: string | null;
}

/** Surligne en jaune l'extrait choisi (reviews.highlight) dans le texte de l'avis. */
const withHighlight = (text: string, highlight?: string | null) => {
  const h = (highlight || "").trim();
  if (!h) return text;
  const i = text.toLowerCase().indexOf(h.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-yellow-300 text-black rounded px-0.5">{text.slice(i, i + h.length)}</mark>
      {text.slice(i + h.length)}
    </>
  );
};


interface ReviewsEditorProps {
  businessId: string;
}

export interface ReviewsEditorRef {
  refresh: () => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  tripadvisor: "TripAdvisor",
  restaurant_guru: "Restaurant Guru",
};

const ReviewsEditor = forwardRef<ReviewsEditorRef, ReviewsEditorProps>(({ businessId }, ref) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, source, author_name, rating, text, text_fr, language, relative_time, published_at, is_default, is_hidden, highlight")
      .eq("business_id", businessId)
      .order("is_default", { ascending: false })
      .order("rating", { ascending: false, nullsFirst: false });
    setReviews((data as unknown as Review[]) || []);
    setLoading(false);
  }, [businessId]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  useEffect(() => { load(); }, [load]);

  const handleSetDefault = async (reviewId: string, value: boolean) => {
    if (value) {
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

  const handleToggleHidden = async (reviewId: string, value: boolean) => {
    const { error } = await supabase.from("reviews").update({ is_hidden: value } as any).eq("id", reviewId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(value ? "Avis masqué" : "Avis visible");
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("reviews").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success("Avis supprimé");
    load();
  };

  const defaultReview = reviews.find(r => r.is_default);
  const otherReviews = reviews.filter(r => !r.is_default);

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

  const renderReviewActions = (review: Review) => (
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
      <button
        type="button"
        onClick={() => setDeleteTarget(review)}
        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        title="Supprimer cet avis"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{reviews.length} avis enregistré{reviews.length > 1 ? "s" : ""}</p>
      
      {/* AVIS PAR DÉFAUT - Mis en avant */}
      {defaultReview && (
        <div className="p-4 rounded-lg border-2 border-primary bg-primary/10 ring-1 ring-primary/30">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Avis mis en avant</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  {SOURCE_LABELS[defaultReview.source] || defaultReview.source}
                </span>
              </div>
              <p className="text-sm font-medium mb-2 leading-relaxed">
                {withHighlight(defaultReview.text_fr || defaultReview.text || "Aucun texte", defaultReview.highlight)}
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
            {renderReviewActions(defaultReview)}
          </div>
        </div>
      )}

      {/* Liste des autres avis */}
      <div className="space-y-2">
        {otherReviews.map(review => (
          <div
            key={review.id}
            className="flex gap-3 p-3 rounded-lg border border-border bg-card text-sm"
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
              {(review.text_fr || review.text) && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {withHighlight(review.text_fr || review.text || "", review.highlight)}
                </p>
              )}
            </div>
            {renderReviewActions(review)}
          </div>
        ))}
      </div>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'avis de <strong>{deleteTarget?.author_name || "Anonyme"}</strong> ({SOURCE_LABELS[deleteTarget?.source || ""] || deleteTarget?.source}) sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

ReviewsEditor.displayName = "ReviewsEditor";

export default ReviewsEditor;
