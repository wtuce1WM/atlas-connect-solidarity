import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = { source_page: string | null; session_id: string | null; event_type: string };

const PERIODS = [
  { label: "7 j", days: 7 },
  { label: "30 j", days: 30 },
  { label: "90 j", days: 90 },
];

const CATS = [
  { key: "home", label: "Home", color: "bg-gold" },
  { key: "search", label: "Recherche", color: "bg-blue-500" },
  { key: "fiche", label: "Fiche directe", color: "bg-emerald-500" },
  { key: "blog", label: "Blog", color: "bg-purple-500" },
  { key: "embed", label: "Widgets", color: "bg-cyan-500" },
  { key: "club", label: "Club", color: "bg-pink-500" },
  { key: "affiliates", label: "Affiliés", color: "bg-amber-600" },
  { key: "staff", label: "Staff (interne)", color: "bg-muted-foreground" },
  { key: "other", label: "Autre", color: "bg-slate-400" },
] as const;

type CatKey = (typeof CATS)[number]["key"];

const KNOWN_PREFIXES: Record<string, CatKey> = {
  search: "search",
  blog: "blog",
  embed: "embed",
  club: "club",
  affiliates: "affiliates",
  staff: "staff",
  studio: "staff",
  auth: "other",
  install: "other",
  tv: "other",
};

function categorize(sourcePage: string | null): CatKey {
  if (!sourcePage) return "other";
  let path = sourcePage.split("?")[0].split("#")[0];
  // strip locale prefix (/en, /fr...)
  path = path.replace(/^\/(en|fr|es|de|it)(?=\/|$)/, "");
  if (!path || path === "/") return "home";
  const seg = path.replace(/^\//, "").split("/");
  const first = seg[0];
  if (KNOWN_PREFIXES[first]) return KNOWN_PREFIXES[first];
  if (first === "fiche") return "fiche";
  if (seg.length === 1) return "fiche"; // slug d'établissement
  return "other";
}

const FrequentationPanel = () => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeStaff, setIncludeStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await supabase
        .from("business_events")
        .select("source_page, session_id, event_type")
        .eq("event_type", "view")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000);
      if (!cancelled) {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days]);

  const stats = useMemo(() => {
    const map = new Map<CatKey, { views: number; sessions: Set<string> }>();
    for (const c of CATS) map.set(c.key, { views: 0, sessions: new Set() });
    for (const r of rows) {
      const k = categorize(r.source_page);
      const e = map.get(k)!;
      e.views += 1;
      if (r.session_id) e.sessions.add(r.session_id);
    }
    const list = CATS.map((c) => ({
      ...c,
      views: map.get(c.key)!.views,
      sessions: map.get(c.key)!.sessions.size,
    })).filter((c) => (includeStaff ? true : c.key !== "staff"));
    const total = list.reduce((s, c) => s + c.views, 0) || 1;
    return { list: list.sort((a, b) => b.views - a.views), total };
  }, [rows, includeStaff]);

  const max = stats.list[0]?.views || 1;

  return (
    <div className="max-w-4xl mx-auto mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gold" /> Fréquentation
        </h2>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant={includeStaff ? "default" : "outline"} onClick={() => setIncludeStaff((v) => !v)}>
            Staff
          </Button>
        </div>
      </div>

      <div className="bg-background rounded-xl border p-5">
        <p className="text-xs text-muted-foreground mb-4">
          Ouvertures de fiche (événements internes <code>view</code>) réparties par type de page d'origine —
          source de vérité indépendante des URLs cosmétiques.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="space-y-3">
            {stats.list.map((c) => {
              const pct = (c.views / stats.total) * 100;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {c.views.toLocaleString("fr-FR")} vues · {pct.toFixed(1)}% · {c.sessions} sessions
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.color}`}
                      style={{ width: `${Math.max(2, (c.views / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 text-xs text-muted-foreground border-t mt-4">
              Total : {stats.total.toLocaleString("fr-FR")} ouvertures de fiche sur {days} jours
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrequentationPanel;
