import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  updated_at: string;
  step_id: string;
  step_label: string;
};

type SortKey = "alpha" | "updated";

/**
 * Lecture seule : toutes les notes internes rattachées aux étapes
 * des « Scénarios vidéo : étapes et textes » en mode Scénario auto — Corporate.
 */
const StoryboardStepNotesList = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("updated");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: steps } = await supabase
      .from("video_scenario_steps")
      .select("id, label, scene_key, position")
      .eq("mode", "corporate")
      .order("position", { ascending: true });

    const stepList = (steps ?? []) as any[];
    const ids = stepList.map((s) => s.id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: notes } = await supabase
      .from("video_scenario_step_notes")
      .select("id, title, content, updated_at, step_id")
      .in("step_id", ids);

    const labelById = new Map(stepList.map((s) => [s.id, String(s.label || s.scene_key)]));
    setRows(
      ((notes ?? []) as any[]).map((n) => ({
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
        <p className="text-xs text-muted-foreground">Aucune note interne d'étape en mode Scénario auto — Corporate.</p>
      )}

      <div className="space-y-3">
        {sorted.map((n) => (
          <div key={n.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-black truncate">{n.title || "Sans titre"}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(n.updated_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Étape : {n.step_label}</p>
            <div
              className="prose prose-sm max-w-none text-black [&_*]:!text-black"
              dangerouslySetInnerHTML={{ __html: n.content ?? "" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryboardStepNotesList;
