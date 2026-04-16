import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface VideoRow {
  id: string;
  url: string;
  name: string | null;
  city: string | null;
  neighborhood: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  show_on_front: boolean;
  business_name: string;
}

const VideoDbStructurePanel = () => {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: docs } = await supabase
      .from("business_documents" as any)
      .select("id, url, name, city, neighborhood, thumbnail_url, sort_order, show_on_front, business_id")
      .eq("type", "video")
      .order("business_id")
      .limit(1000);
    if (!docs || docs.length === 0) { setRows([]); setLoading(false); return; }

    const bizIds = [...new Set((docs as any[]).map(d => d.business_id))];
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, name")
      .in("id", bizIds);
    const nameMap = new Map((businesses || []).map(b => [b.id, b.name]));

    setRows((docs as any[]).map(d => ({
      id: d.id,
      url: d.url,
      name: d.name,
      city: d.city,
      neighborhood: d.neighborhood,
      thumbnail_url: d.thumbnail_url,
      sort_order: d.sort_order,
      show_on_front: d.show_on_front,
      business_name: nameMap.get(d.business_id) || "?",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? rows.filter(r =>
        r.business_name.toLowerCase().includes(search.toLowerCase()) ||
        r.id.includes(search) ||
        (r.city || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.name || "").toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`ID copié : ${id.slice(0, 8)}…`);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold">Structure DB — Documents Vidéo ({rows.length})</h3>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par établissement, ville, ID…"
            className="h-8 text-xs pl-7"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[70vh]">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left py-2 px-2 font-medium">ID</th>
              <th className="text-left py-2 px-2 font-medium">Établissement</th>
              <th className="text-left py-2 px-2 font-medium">Nom</th>
              <th className="text-left py-2 px-2 font-medium">Ville</th>
              <th className="text-left py-2 px-2 font-medium">URL</th>
              <th className="text-center py-2 px-2 font-medium">Front</th>
              <th className="text-center py-2 px-2 font-medium">Ordre</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="py-1.5 px-2">
                  <button
                    onClick={() => copyId(r.id)}
                    className="flex items-center gap-1 font-mono text-[10px] hover:text-primary transition-colors"
                    title="Copier l'ID"
                  >
                    <Copy className="h-3 w-3" />
                    {r.id.slice(0, 8)}…
                  </button>
                </td>
                <td className="py-1.5 px-2 font-medium">{r.business_name}</td>
                <td className="py-1.5 px-2 text-muted-foreground">{r.name || "—"}</td>
                <td className="py-1.5 px-2 text-muted-foreground">{r.city || "—"}</td>
                <td className="py-1.5 px-2 max-w-[200px] truncate text-muted-foreground" title={r.url}>{r.url}</td>
                <td className="py-1.5 px-2 text-center">{r.show_on_front ? "✓" : ""}</td>
                <td className="py-1.5 px-2 text-center">{r.sort_order}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoDbStructurePanel;
