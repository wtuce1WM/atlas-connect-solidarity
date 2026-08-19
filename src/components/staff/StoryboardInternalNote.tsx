import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

/** Note interne d'un montage manuel (storyboard), stockée sur le montage. */
const StoryboardInternalNote = ({ boardId }: { boardId: string }) => {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("video_storyboards" as any)
      .select("internal_note")
      .eq("id", boardId)
      .maybeSingle();
    setNote(((data as any)?.internal_note as string) ?? "");
    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (plainLen(note) > MAX_NOTE) return toast.error(`Note limitée à ${MAX_NOTE} caractères.`);
    setSaving(true);
    const { error } = await supabase
      .from("video_storyboards" as any)
      .update({ internal_note: note } as any)
      .eq("id", boardId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Note enregistrée");
  };

  const len = plainLen(note);

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-black">Note interne du montage</span>
        <span className={`text-xs ${len > MAX_NOTE ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {len}/{MAX_NOTE}
        </span>
      </div>
      <RichTextEditor content={note} onChange={setNote} className="prose-base" maxHeight="60vh" />
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Enregistrer la note
        </Button>
      </div>
    </div>
  );
};

export default StoryboardInternalNote;
