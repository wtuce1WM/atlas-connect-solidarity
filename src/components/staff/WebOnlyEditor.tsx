import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface WebOnlyEditorProps {
  businessId: string;
}

const MAX_DESC_LENGTH = 1500;

const WebOnlyEditor = ({ businessId }: WebOnlyEditorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_web_only" as any)
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (data) {
        setRecordId((data as any).id);
        setDescription((data as any).description || "");
      } else {
        setRecordId(null);
        setDescription("");
      }
      setLoading(false);
    };
    load();
  }, [businessId]);

  // Save
  const save = useCallback(async (desc: string) => {
    setSaving(true);
    const payload = {
      business_id: businessId,
      description: desc,
      updated_at: new Date().toISOString(),
    };

    if (recordId) {
      await supabase
        .from("business_web_only" as any)
        .update(payload as any)
        .eq("id", recordId);
    } else {
      const { data } = await supabase
        .from("business_web_only" as any)
        .insert(payload as any)
        .select("id")
        .single();
      if (data) setRecordId((data as any).id);
    }
    setSaving(false);
  }, [businessId, recordId]);

  const handleDescriptionChange = useCallback((html: string) => {
    setDescription(html);
    save(html);
  }, [save]);

  const plainTextLength = description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().length;

  if (loading) {
    return (
      <div className="p-4 border border-purple-300 bg-purple-50 rounded-lg flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement section Web Only…</span>
      </div>
    );
  }

  return (
    <div className="p-4 border-2 border-purple-400 bg-purple-50 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-purple-600" />
          Web Only
        </Label>
        {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sauvegarde…</span>}
      </div>

      {/* Rich text description */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Description Web Only</Label>
        <RichTextEditor
          content={description}
          onChange={handleDescriptionChange}
          placeholder="Décrivez l'offre web only…"
          maxHeight="400px"
        />
        <p className={`text-xs text-right ${plainTextLength > MAX_DESC_LENGTH ? "text-destructive font-bold" : plainTextLength > MAX_DESC_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
          {plainTextLength} / {MAX_DESC_LENGTH}{plainTextLength > MAX_DESC_LENGTH && " ⚠ Limite dépassée"}
        </p>
      </div>
    </div>
  );
};

export default WebOnlyEditor;
