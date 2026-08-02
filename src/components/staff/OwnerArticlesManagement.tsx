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
  ownerCount: number;
  genericCount: number;
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
        .select("anchor_business_id, anchor_kind")
        .not("anchor_business_id", "is", null);
      if (!posts) { setIsLoading(false); return; }

      const counts = new Map<string, number>();
      const ownerCounts = new Map<string, number>();
      const genericCounts = new Map<string, number>();
      for (const p of posts as any[]) {
        const id = p.anchor_business_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
        if (p.anchor_kind === "owner") {
          ownerCounts.set(id, (ownerCounts.get(id) ?? 0) + 1);
        } else {
          genericCounts.set(id, (genericCounts.get(id) ?? 0) + 1);
        }
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
          ownerCount: ownerCounts.get(id) ?? 0,
          genericCount: genericCounts.get(id) ?? 0,
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
  const totalOwner = groups.reduce((s, g) => s + g.ownerCount, 0);
  const totalGeneric = groups.reduce((s, g) => s + g.genericCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Articles propriétaires</h2>
        <p className="text-sm text-muted-foreground">
          {totalPosts} article{totalPosts > 1 ? "s" : ""} rattaché{totalPosts > 1 ? "s" : ""} à {groups.length} établissement{groups.length > 1 ? "s" : ""} — {totalOwner} propriétaire{totalOwner > 1 ? "s" : ""}, {totalGeneric} générique{totalGeneric > 1 ? "s" : ""}
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded((s) => ({ ...s, [g.business_id]: !open }))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((s) => ({ ...s, [g.business_id]: !open })); }}
                  className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <Store className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{g.business_name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{g.business_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-1 rounded bg-primary/15 text-primary font-medium">
                      {g.ownerCount} propriétaire{g.ownerCount > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-medium">
                      {g.genericCount} générique{g.genericCount > 1 ? "s" : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setAttachTarget(g); }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Rattacher
                    </Button>
                  </div>
                </div>
                {open && (
                  <div className="border-t p-4 bg-muted/20 space-y-8">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">
                        Articles propriétaires ({g.ownerCount})
                      </h3>
                      <BlogManagement
                        anchorBusinessId={g.business_id}
                        anchorKind="owner"
                        allowKindSwitch
                        onKindChange={() => setReloadKey((k) => k + 1)}
                        title=""
                        subtitle="Articles dédiés à cet établissement (titre/contenu centré sur lui)"
                        showInternalLinks={false}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
                        Articles génériques rattachés ({g.genericCount})
                      </h3>
                      <BlogManagement
                        anchorBusinessId={g.business_id}
                        anchorKind="generic"
                        allowKindSwitch
                        onKindChange={() => setReloadKey((k) => k + 1)}
                        title=""
                        subtitle="Articles thématiques mutualisés, exploités par l'assistant IA embed"
                        showInternalLinks={false}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {attachTarget && (
        <AttachArticlesDialog
          open={!!attachTarget}
          onOpenChange={(v) => { if (!v) setAttachTarget(null); }}
          businessId={attachTarget.business_id}
          businessName={attachTarget.business_name}
          onAttached={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default OwnerArticlesManagement;
