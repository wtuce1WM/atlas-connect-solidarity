import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, NotebookPen } from "lucide-react";
import RichTextEditor from "@/components/staff/RichTextEditor";

const MAX_NOTE = 3000;

const plainLen = (html: string) => {
  if (!html) return 0;
  if (typeof window === "undefined") return html.length;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length;
};

/**
 * Note personnelle de l'affilié (table `business_affiliate_notes`, accès staff/propriétaire).
 * Distinct de la note interne staff existante. RichText, 3000 caractères max,
 * popup centré dimensionné pour éviter tout scroll de la modale.
 */
const AffiliatePrivateNoteDialog = ({
  businessId,
  initialNote,
  onSaved,
}: {
  businessId: string;
  initialNote: string | null;
  onSaved?: (note: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(initialNote ?? ""); }, [initialNote, businessId]);

  const len = plainLen(value);
  const over = len > MAX_NOTE;
  const hasNote = plainLen(initialNote ?? "") > 0;

  const save = async () => {
    if (over) {
      toast.error(`Note limitée à ${MAX_NOTE} caractères.`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("business_affiliate_notes")
      .upsert({ business_id: businessId, note: value || null } as any, { onConflict: "business_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    onSaved?.(value);
    toast.success("Note enregistrée");
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`h-auto w-full py-1.5 sm:w-auto ${hasNote ? "border-gold/50 text-gold hover:text-gold" : ""}`}
      >
        <NotebookPen className="h-4 w-4 mr-1 shrink-0" />
        <span className="flex flex-col leading-tight sm:block">
          <span>Note</span>
          <span className="sm:before:content-['_']">interne</span>
        </span>
      </Button>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border text-foreground dark sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Note interne</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Note personnelle, visible uniquement par vous. Elle n'est jamais publiée ni utilisée par l'IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <Label className="text-white">Votre note</Label>
              <span className={`text-xs ${over ? "text-destructive font-medium" : "text-white/60"}`}>
                {len}/{MAX_NOTE}
              </span>
            </div>
            <RichTextEditor
              content={value}
              onChange={setValue}
              bgClass="border border-white/10 bg-zinc-900 text-white"
              maxHeight="52vh"
              simple
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={save} disabled={saving || over}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer la note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AffiliatePrivateNoteDialog;
