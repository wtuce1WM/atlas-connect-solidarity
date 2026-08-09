import { useMemo, useState } from "react";
import { SI_ROUTES } from "@/data/siRoutes";
import { Search } from "lucide-react";

type Zone = "Public" | "Club" | "Affiliés" | "Backoffice" | "Embeds" | "Blog" | "Autres";

const zoneOf = (p: string): Zone => {
  if (p.startsWith("/embed")) return "Embeds";
  if (p.startsWith("/staff")) return "Backoffice";
  if (p.startsWith("/affiliates")) return "Affiliés";
  if (p.startsWith("/club")) return "Club";
  if (p.startsWith("/blog")) return "Blog";
  if (p.startsWith("/") && !p.startsWith("/*")) return "Public";
  return "Autres";
};

const ZONES: Zone[] = ["Public", "Blog", "Club", "Affiliés", "Backoffice", "Embeds", "Autres"];

/** Carte des routes front, groupées par zone d'accès. */
const RoutesMapPanel = () => {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const g: Record<string, { path: string; component: string }[]> = {};
    SI_ROUTES.filter((r) => !s || r.path.toLowerCase().includes(s) || r.component.toLowerCase().includes(s)).forEach((r) => {
      const z = zoneOf(r.path);
      (g[z] ||= []).push(r);
    });
    return g;
  }, [q]);

  return (
    <div className="h-full overflow-auto p-4 text-foreground">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="route ou composant…" className="h-8 pl-8 pr-3 rounded-md border border-border bg-background text-xs w-60" />
        </div>
        <span className="text-xs text-muted-foreground">{SI_ROUTES.length} routes</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ZONES.filter((z) => groups[z]?.length).map((z) => (
          <div key={z} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{z}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-semibold">{groups[z].length}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {groups[z].map((r) => (
                <li key={r.path + r.component} className="text-[11px] flex items-baseline justify-between gap-2">
                  <code className="font-mono">{r.path || "/"}</code>
                  <span className="text-muted-foreground shrink-0">{r.component}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Extrait automatiquement de <code>src/App.tsx</code>. Les préfixes de langue (/en, /ar) s'appliquent en plus des chemins listés.</p>
    </div>
  );
};

export default RoutesMapPanel;
