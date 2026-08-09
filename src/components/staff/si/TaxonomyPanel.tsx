import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader, ChevronRight } from "lucide-react";

interface Node { id: string; name: string; subcats: string[]; badges: string[]; services: string[] }

/** Arbre Structure du Front → sous-catégories / badges / services (lecture live). */
const TaxonomyPanel = () => {
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ cats: number; subcats: number; badges: number; services: number } | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase as any;
      const [fs, fss, fsb, fsv, subs, badges, servs, cats] = await Promise.all([
        sb.from("front_structure").select("id, name, sort_order").order("sort_order"),
        sb.from("front_structure_subcategories").select("front_structure_id, subcategory_id, sort_order"),
        sb.from("front_structure_badges").select("front_structure_id, badge_id, sort_order"),
        sb.from("front_structure_services").select("front_structure_id, service_id, sort_order"),
        sb.from("subcategories").select("id, name_fr"),
        sb.from("badges").select("id, name_fr"),
        sb.from("services").select("id, name_fr"),
        sb.from("categories").select("id", { count: "exact", head: true }),
      ]);
      const nameOf = (rows: any[]) => new Map((rows || []).map((r: any) => [r.id, r.name_fr]));
      const S = nameOf(subs.data), B = nameOf(badges.data), V = nameOf(servs.data);
      setNodes(
        ((fs.data as any[]) || []).map((f) => ({
          id: f.id,
          name: f.name,
          subcats: ((fss.data as any[]) || []).filter((x) => x.front_structure_id === f.id).map((x) => S.get(x.subcategory_id)).filter(Boolean),
          badges: ((fsb.data as any[]) || []).filter((x) => x.front_structure_id === f.id).map((x) => B.get(x.badge_id)).filter(Boolean),
          services: ((fsv.data as any[]) || []).filter((x) => x.front_structure_id === f.id).map((x) => V.get(x.service_id)).filter(Boolean),
        }))
      );
      setCounts({ cats: cats.count || 0, subcats: (subs.data || []).length, badges: (badges.data || []).length, services: (servs.data || []).length });
    })();
  }, []);

  if (!nodes) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader className="h-4 w-4 animate-spin" /> Chargement de la taxonomie…</div>;

  return (
    <div className="h-full overflow-auto p-4 text-foreground">
      {counts && (
        <div className="flex gap-2 flex-wrap mb-3 text-xs">
          {[["Onglets Front", nodes.length], ["Catégories", counts.cats], ["Sous-catégories", counts.subcats], ["Badges", counts.badges], ["Services", counts.services]].map(([l, n]) => (
            <span key={l as string} className="px-2.5 py-1 rounded-full bg-muted font-semibold">{l} : {n as number}</span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {nodes.map((n) => (
          <div key={n.id} className="rounded-lg border border-border bg-background">
            <button onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full flex items-center gap-2 p-2.5 text-left text-sm">
              <ChevronRight className={`h-4 w-4 transition-transform ${open === n.id ? "rotate-90" : ""}`} />
              <span className="font-bold">{n.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{n.subcats.length} sous-cat · {n.badges.length} badges · {n.services.length} services</span>
            </button>
            {open === n.id && (
              <div className="px-3 pb-3 grid gap-2 md:grid-cols-3 text-[11px]">
                {([["Sous-catégories", n.subcats], ["Badges", n.badges], ["Services", n.services]] as [string, string[]][]).map(([l, arr]) => (
                  <div key={l}>
                    <div className="uppercase font-semibold text-muted-foreground mb-1">{l}</div>
                    <div className="flex flex-wrap gap-1">
                      {arr.length === 0 ? <span className="text-muted-foreground">—</span> : arr.map((x) => <span key={x} className="px-1.5 py-0.5 rounded bg-muted">{x}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaxonomyPanel;
