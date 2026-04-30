import { useCallback, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  /** Called after successful import so the parent can reload the list */
  onImported: () => void | Promise<void>;
  /** Computes the next sort_order to assign (max + 1) */
  getNextSortOrder: () => number;
  className?: string;
}

/**
 * Imports a `business_documents` video into `generic_videos`.
 * - Validates the ID is a video doc
 * - Copies url / name / thumbnail / description / city / neighborhood
 * - Replicates `business_document_cities` rows into `generic_video_cities`
 *
 * After import, the new card is editable inline via the existing assignment
 * buttons (POIs, businesses, sub-categories, badges, cities…).
 */
const ImportFromBusinessDocInput = ({ onImported, getNextSortOrder, className }: Props) => {
  const [docId, setDocId] = useState("");
  const [busy, setBusy] = useState(false);

  const isUuid = (v: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim());

  const handleImport = useCallback(async () => {
    const id = docId.trim();
    if (!isUuid(id)) {
      toast.error("ID invalide (UUID attendu)");
      return;
    }
    setBusy(true);
    try {
      // 1. Fetch source doc
      const { data: doc, error: fetchErr } = await supabase
        .from("business_documents")
        .select("id, type, url, name, thumbnail_url, description, city, neighborhood")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!doc) {
        toast.error("Aucune vidéo trouvée pour cet ID");
        return;
      }
      if (doc.type !== "video") {
        toast.error("Ce document n'est pas une vidéo");
        return;
      }

      // 2. Insert into generic_videos
      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("generic_videos")
        .insert({
          url: doc.url,
          name: doc.name,
          thumbnail_url: doc.thumbnail_url,
          description: doc.description,
          city: doc.city,
          neighborhood: doc.neighborhood,
          sort_order: getNextSortOrder(),
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      const newId = inserted?.id as string | undefined;

      // 3. Copy cities mapping
      if (newId) {
        const { data: cityLinks } = await (supabase as any)
          .from("business_document_cities")
          .select("city_id")
          .eq("document_id", id);
        const cityRows = ((cityLinks as { city_id: string }[]) || []).map((c) => ({
          generic_video_id: newId,
          city_id: c.city_id,
        }));
        if (cityRows.length > 0) {
          await (supabase as any).from("generic_video_cities").insert(cityRows);
        }
      }

      toast.success("Vidéo copiée dans les Génériques");
      setDocId("");
      await onImported();
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la copie");
    } finally {
      setBusy(false);
    }
  }, [docId, getNextSortOrder, onImported]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Input
        value={docId}
        onChange={(e) => setDocId(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) handleImport();
        }}
        placeholder="Coller un ID business_documents à importer…"
        className="h-7 text-xs font-mono w-[340px]"
        disabled={busy}
      />
      <Button size="sm" variant="secondary" className="h-7" onClick={handleImport} disabled={busy || !docId.trim()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        <span className="ml-1 text-xs">Importer</span>
      </Button>
    </div>
  );
};

export default ImportFromBusinessDocInput;
