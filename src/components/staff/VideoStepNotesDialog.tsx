import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";

const MAX_NOTE = 20000;

type StepNote = {
  id: string;
  step_id: string;
  title: string | null;
  content: string | null;
  position: number;
  _new?: boolean;
};

const plainLen = (html: string) => {
  if (!html) return 0;
  if (typeof window === "undefined") return html.length;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length;
};

/**
 * Notes internes multiples rattachées à une étape de scénario vidéo.
 * Popup large, édition d'une note à la fois pour éviter tout scroll inutile.
 */
const VideoStepNotesDialog = ({
  stepId,
  stepLabel,
  disabled,
  count,
  onCountChange,
}: {
  stepId: string;
  stepLabel: string;
  disabled?: boolean;
  count: number;
  onCountChange: (n: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<StepNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_scenario_step_notes")
      .select("id, step_id, title, content, position")
      .eq("step_id", stepId)
      .order("position", { ascending: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    const rows = (data ?? []) as StepNote[];
    setNotes(rows);
    setActiveId(rows[0]?.id ?? null);
    onCountChangeRef.current(rows.length);
  }, [stepId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const patchActive = (values: Partial<StepNote>) =>
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, ...values } : n)));

  const addNote = () => {
    const id = crypto.randomUUID();
    setNotes((prev) => [
      ...prev,
      { id, step_id: stepId, title: `Note ${prev.length + 1}`, content: "", position: (prev.length + 1) * 10, _new: true },
    ]);
    setActiveId(id);
  };

  const removeNote = async (note: StepNote) => {
    if (!note._new) {
      const { error } = await supabase.from("video_scenario_step_notes").delete().eq("id", note.id);
      if (error) return toast.error(error.message);
    }
    const rest = notes.filter((n) => n.id !== note.id);
    setNotes(rest);
    setActiveId(rest[0]?.id ?? null);
    onCountChangeRef.current(rest.length);
    toast.success("Note supprimée");
  };

  const saveAll = async () => {
    const over = notes.find((n) => plainLen(n.content ?? "") > MAX_NOTE);
    if (over) return toast.error(`Note « ${over.title || "sans titre"} » limitée à ${MAX_NOTE} caractères.`);
    setSaving(true);
    const rows = notes.map((n, i) => ({
      id: n.id,
      step_id: stepId,
      title: n.title,
      content: n.content,
      position: (i + 1) * 10,
    }));
    const { error } = rows.length
      ? await supabase.from("video_scenario_step_notes").upsert(rows, { onConflict: "id" })
      : { error: null };
    setSaving(false);
    if (error) return toast.error(error.message);
    setNotes((prev) => prev.map((n) => ({ ...n, _new: false })));
    onCountChangeRef.current(rows.length);
    toast.success("Notes enregistrées");
  };

  const len = plainLen(active?.content ?? "");

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-[11px]"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={disabled ? "Enregistre d'abord le scénario pour ajouter des notes" : undefined}
      >
        <NotebookPen className="h-3.5 w-3.5 mr-1" />
        Notes internes{count > 0 ? ` (${count})` : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-6xl h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Notes internes — {stepLabel}</DialogTitle>
            <DialogDescription>
              Notes de production réservées au staff. Elles ne sont ni publiées ni utilisées au montage.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[240px_1fr] flex-1 min-h-0">
            <div className="flex flex-col gap-2 min-h-0">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addNote}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nouvelle note
              </Button>
              <div className="flex-1 overflow-y-auto rounded-md border divide-y">
                {loading && (
                  <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Chargement…
                  </div>
                )}
                {!loading && notes.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Aucune note pour cette étape.</p>
                )}
                {notes.map((n) => (
                  <div key={n.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveId(n.id)}
                      className={`flex-1 text-left px-3 py-2 text-xs truncate ${
                        n.id === activeId ? "bg-muted font-semibold" : "hover:bg-muted/50"
                      }`}
                    >
                      {n.title || "Sans titre"}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeNote(n)}
                      aria-label="Supprimer la note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 min-h-0">
              {active ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={active.title ?? ""}
                      onChange={(e) => patchActive({ title: e.target.value })}
                      placeholder="Titre de la note"
                      className="h-8 text-sm"
                    />
                    <span className={`text-xs whitespace-nowrap ${len > MAX_NOTE ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {len}/{MAX_NOTE}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <RichTextEditor
                      content={active.content ?? ""}
                      onChange={(html) => patchActive({ content: html })}
                      className="prose-base"
                      maxHeight="calc(88vh - 220px)"
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Crée une note pour commencer.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Fermer
            </Button>
            <Button onClick={saveAll} disabled={saving || notes.length === 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Enregistrer les notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoStepNotesDialog;
