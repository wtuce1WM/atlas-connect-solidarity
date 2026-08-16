import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Nom du job éditable en place (Derniers jobs Promo / Feed).
 * Le titre n'affecte pas le rendu : il sert au repérage et au nom de fichier
 * de repli, donc l'édition est autorisée même après rendu.
 */
const VideoJobTitleEditor = ({
  jobId,
  title,
  onSaved,
}: {
  jobId: string;
  title: string | null;
  onSaved?: (next: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next = value.trim().slice(0, 120);
    if (!next) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("video_jobs").update({ title: next }).eq("id", jobId);
    setSaving(false);
    if (error) {
      toast.error(`Renommage impossible : ${error.message}`);
      return;
    }
    setEditing(false);
    onSaved?.(next);
    toast.success("Nom du job mis à jour.");
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-black font-medium">{title || jobId.slice(0, 8)}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground"
          title="Renommer ce job"
          onClick={() => {
            setValue(title ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-64 text-xs form-legible"
      />
      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={save} title="Enregistrer">
        <Check className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)} title="Annuler">
        <X className="h-3 w-3" />
      </Button>
    </span>
  );
};

export default VideoJobTitleEditor;
