import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface UnassignedPost {
  id: string;
  title_fr: string | null;
  slug_fr: string | null;
  published_at: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
  businessName: string;
  onAttached?: () => void;
}

const AttachArticlesDialog = ({ open, onOpenChange, businessId, businessName, onAttached }: Props) => {
  const [posts, setPosts] = useState<UnassignedPost[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQ("");
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title_fr, slug_fr, published_at, created_at")
        .is("anchor_business_id", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) toast.error("Chargement impossible");
      setPosts((data as any) ?? []);
      setLoading(false);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return posts;
    return posts.filter((p) =>
      (p.title_fr ?? "").toLowerCase().includes(t) ||
      (p.slug_fr ?? "").toLowerCase().includes(t)
    );
  }, [posts, q]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    if (selected.size === 0) { onOpenChange(false); return; }
    setSaving(true);
    const { error } = await supabase
      .from("blog_posts")
      .update({ anchor_business_id: businessId })
      .in("id", Array.from(selected));
    setSaving(false);
    if (error) { toast.error("Échec du rattachement"); return; }
    toast.success(`${selected.size} article${selected.size > 1 ? "s" : ""} rattaché${selected.size > 1 ? "s" : ""} à ${businessName}`);
    onOpenChange(false);
    onAttached?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rattacher des articles à {businessName}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un article…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md divide-y">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Aucun article sans propriétaire.</div>
          ) : (
            filtered.map((p) => {
              const checked = selected.has(p.id);
              return (
                <label key={p.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{p.title_fr ?? "(sans titre)"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{p.slug_fr}</div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <DialogFooter>
          <div className="mr-auto text-sm text-muted-foreground self-center">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving || selected.size === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Rattacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachArticlesDialog;
