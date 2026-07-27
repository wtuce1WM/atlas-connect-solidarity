import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BlogManagement from "@/components/staff/BlogManagement";
import AttachArticlesDialog from "@/components/staff/AttachArticlesDialog";

interface OwnerGroup {
  business_id: string;
  business_name: string;
  count: number;
}

const OwnerArticlesManagement = () => {
  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [attachTarget, setAttachTarget] = useState<OwnerGroup | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("anchor_business_id")
        .not("anchor_business_id", "is", null);
      if (!posts) { setIsLoading(false); return; }

      const counts = new Map<string, number>();
      for (const p of posts as any[]) {
        const id = p.anchor_business_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      const ids = Array.from(counts.keys());
      if (ids.length === 0) { setGroups([]); setIsLoading(false); return; }

      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", ids);
      const nameMap = new Map<string, string>();
      (biz ?? []).forEach((b: any) => nameMap.set(b.id, b.name));

      const list: OwnerGroup[] = ids
        .map((id) => ({
          business_id: id,
          business_name: nameMap.get(id) ?? "(établissement inconnu)",
          count: counts.get(id) ?? 0,
        }))
        .sort((a, b) => b.count - a.count || a.business_name.localeCompare(b.business_name));

      setGroups(list);
      // Auto-expand if only one group
      if (list.length === 1) setExpanded({ [list[0].business_id]: true });
      setIsLoading(false);
    };
    load();
  }, [reloadKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPosts = groups.reduce((s, g) => s + g.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Articles propriétaires</h2>
        <p className="text-sm text-muted-foreground">
          {totalPosts} article{totalPosts > 1 ? "s" : ""} rattaché{totalPosts > 1 ? "s" : ""} à {groups.length} établissement{groups.length > 1 ? "s" : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun article rattaché à un établissement.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const open = !!expanded[g.business_id];
            return (
              <Card key={g.business_id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [g.business_id]: !open }))}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <Store className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{g.business_name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{g.business_id}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground shrink-0">
                    {g.count} article{g.count > 1 ? "s" : ""}
                  </div>
                </button>
                {open && (
                  <div className="border-t p-4 bg-muted/20">
                    <BlogManagement
                      anchorBusinessId={g.business_id}
                      title=""
                      subtitle={`${g.count} article${g.count > 1 ? "s" : ""} — épinglés en tête, puis même ordre que /blog`}
                      showInternalLinks={false}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerArticlesManagement;
