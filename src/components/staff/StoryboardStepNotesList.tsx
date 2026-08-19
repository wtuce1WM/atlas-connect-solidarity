import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";

const MAX_NOTE = 20000;

const plainLen = (html: string) => {
  if (!html) return 0;
  if (typeof window === "undefined") return html.length;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length;
};

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  updated_at: string;
  step_id: string | null;
  step_label: string;
};

type SortKey = "alpha" | "updated";

/**
 * Toutes les notes internes rattachées aux étapes des « Scénarios vidéo :
 * étapes et textes » (tous montages). Cartes pliées par défaut, éditeur
 * riche à l'ouverture.
 */
const StoryboardStepNotesList = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("updated");
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [stepsRes, notesRes] = await Promise.all([
      supabase.from("video_scenario_steps").select("id, label, scene_key, mode, position"),
      supabase.from("video_scenario_step_notes").select("id, title, content, updated_at, step_id"),
    ]);

    const labelById = new Map(
      ((stepsRes.data ?? []) as any[]).map((s) => [s.id, String(s.label || s.scene_key)]),
    );
    setRows(
      ((notesRes.data ?? []) as any[]).map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        updated_at: n.updated_at,
        step_id: n.step_id,
        step_label: labelById.get(n.step_id) ?? "Étape",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const list = [...rows];
    if (sort === "alpha") {
      list.sort((a, b) =>
        (a.title || "Sans titre").localeCompare(b.title || "Sans titre", "fr", { sensitivity: "base" }),
      );
    } else {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return list;
  }, [rows, sort]);

  const patch = (id: string, values: Partial<Row>) =>
    setRows((prev) => prev.map((n) => (n.id === id ? { ...n, ...values } : n)));

  const save = async (note: Row) => {
    if (plainLen(note.content ?? "") > MAX_NOTE) {
      return toast.error(`Note limitée à ${MAX_NOTE} caractères.`);
    }
    setSavingId(note.id);
    const { error } = await supabase
      .from("video_scenario_step_notes")
      .update({ title: note.title, content: note.content })
      .eq("id", note.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    patch(note.id, { updated_at: new Date().toISOString() });
    toast.success("Note enregistrée");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={sort === "alpha" ? "default" : "outline"}
          className="h-7 text-[11px]"
          onClick={() => setSort("alpha")}
        >
          Ordre alphabétique
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sort === "updated" ? "default" : "outline"}
          className="h-7 text-[11px]"
          onClick={() => setSort("updated")}
        >
          Dernière modification
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={load} aria-label="Rafraîchir">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Chargement…
        </p>
      )}

      {!loading && sorted.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune note interne d'étape.</p>
      )}

      <div className="space-y-2">
        {sorted.map((n) => {
          const open = openId === n.id;
          const len = plainLen(n.content ?? "");
          return (
            <div key={n.id} className="rounded-lg border">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : n.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
              >
                {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <span className="text-sm font-semibold text-black truncate flex-1">{n.title || "Sans titre"}</span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap hidden sm:inline">
                  {n.step_label}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(n.updated_at).toLocaleDateString("fr-FR")}
                </span>
              </button>

              {open && (
                <div className="p-3 pt-0 space-y-2">
                  <p className="text-[11px] text-muted-foreground">Étape : {n.step_label}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={n.title ?? ""}
                      onChange={(e) => patch(n.id, { title: e.target.value })}
                      placeholder="Titre de la note"
                      className="h-8 text-sm"
                    />
                    <span className={`text-xs whitespace-nowrap ${len > MAX_NOTE ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {len}/{MAX_NOTE}
                    </span>
                  </div>
                  <RichTextEditor
                    content={n.content ?? ""}
                    onChange={(html) => patch(n.id, { content: html })}
                    className="prose-base"
                    maxHeight="55vh"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => save(n)} disabled={savingId === n.id}>
                      {savingId === n.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Enregistrer la note
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoryboardStepNotesList;
