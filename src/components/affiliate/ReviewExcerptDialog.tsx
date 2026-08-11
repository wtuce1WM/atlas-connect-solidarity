import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, X, Quote } from "lucide-react";
import { toast } from "sonner";

interface Props {
  businessId: string;
  onClose: () => void;
}

type Row = {
  id: string;
  source: string | null;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  text_fr: string | null;
  is_default: boolean | null;
  is_hidden: boolean | null;
  highlight: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  tripadvisor: "TripAdvisor",
  restaurant_guru: "Restaurant Guru",
};

/**
 * Popup de sélection de l'extrait par défaut d'un avis client.
 * Même mécanique que le sélecteur d'extrait de Studio Vidéo IA :
 * un avis par défaut (reviews.is_default) + son extrait mis en avant
 * (reviews.highlight). Fond noir = fond de /affiliates.
 */
const ReviewExcerptDialog = ({ businessId, onClose }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [highlight, setHighlight] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("reviews")
        .select("id, source, author_name, rating, text, text_fr, is_default, is_hidden, highlight")
        .eq("business_id", businessId)
        .order("is_default", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false });
      if (cancelled) return;
      const list = ((data as Row[]) || []).filter((r) => !r.is_hidden);
      setRows(list);
      const def = list.find((r) => r.is_default);
      if (def) {
        setSelectedId(def.id);
        setHighlight(def.highlight || "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const textOf = (r: Row) => (r.text_fr || r.text || "").trim();

  const splitSentences = (t: string) =>
    t.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);

  const pick = (r: Row) => {
    setSelectedId(r.id);
    setHighlight(r.highlight || "");
  };

  /** Sélection libre à la souris : dès qu'on relâche, l'extrait est rempli. */
  const useSelection = (r: Row) => {
    const sel = window.getSelection?.();
    const t = (sel?.toString() || "").trim();
    if (!t) return;
    setSelectedId(r.id);
    setHighlight(t.slice(0, 240));
  };

  /** Clic sur une phrase : l'ajoute / la retire de l'extrait. */
  const toggleSentence = (r: Row, sentence: string) => {
    setSelectedId(r.id);
    const base = r.id === selectedId ? highlight : "";
    const parts = splitSentences(base);
    const next = parts.includes(sentence)
      ? parts.filter((p) => p !== sentence)
      : [...splitSentences(textOf(r)).filter((s) => parts.includes(s) || s === sentence)];
    setHighlight(next.join(" ").slice(0, 240));
  };


  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    // Un seul avis par défaut par établissement.
    await (supabase as any)
      .from("reviews")
      .update({ is_default: false })
      .eq("business_id", businessId)
      .neq("id", selectedId);
    const { error } = await (supabase as any)
      .from("reviews")
      .update({ is_default: true, highlight: highlight.trim() || null })
      .eq("id", selectedId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Extrait par défaut enregistré");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-black text-white border border-white/15 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Quote className="h-4 w-4 text-primary" /> Extrait par défaut des avis clients
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-white/60 italic">Aucun avis publié pour cet établissement.</div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="min-h-0 overflow-y-auto p-4 space-y-2 lg:border-r lg:border-white/10">
              {rows.map((r) => {
                const isSel = selectedId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pick(r)}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      isSel ? "border-primary bg-primary/10" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-sm">{r.author_name || "Anonyme"}</span>
                      {r.rating != null && <span className="text-amber-400 font-bold">{r.rating}/5</span>}
                      {r.source && <span className="text-white/50">· {SOURCE_LABELS[r.source] || r.source}</span>}
                      {r.is_default && <span className="text-emerald-400">· actuel</span>}
                    </div>
                    <div className="mt-1 text-xs text-white/60 whitespace-pre-wrap">{textOf(r)}</div>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto p-4 space-y-3">
              {!selectedId ? (
                <p className="text-sm text-white/50">Sélectionnez un avis à gauche.</p>
              ) : (
                <>
                  <div className="text-xs font-medium text-white/70">
                    Extrait à mettre en avant (fiche, vidéos, widgets)
                  </div>
                  <textarea
                    value={highlight}
                    onChange={(e) => setHighlight(e.target.value.slice(0, 240))}
                    rows={6}
                    maxLength={240}
                    className="w-full text-sm rounded-md border border-white/15 bg-white/5 text-white p-3 outline-none focus:border-primary"
                    placeholder="Colle ici la portion de l'avis à mettre en avant"
                  />
                  <div className="text-[11px] text-white/40 text-right">{highlight.length}/240</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1">Aperçu</div>
                    <p className="text-sm italic text-white/90">« {highlight || "…"} »</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 p-3 border-t border-white/10">
          <Button variant="outline" size="sm" onClick={onClose} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
            Annuler
          </Button>
          <Button size="sm" disabled={!selectedId || saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Valider
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewExcerptDialog;
