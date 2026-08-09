import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";

const SOURCES: { table: string; label: string; desc: string; dateCol: string }[] = [
  { table: "business_events", label: "Événements fiche", desc: "vues, clics CTA, rage/dead clicks, intentions commerciales", dateCol: "created_at" },
  { table: "search_logs", label: "Recherches", desc: "requêtes, filtres, résultats — alimente popular_searches", dateCol: "created_at" },
  { table: "ai_usage_events", label: "Usage IA", desc: "tokens & coût par appel (Club, embed, studio)", dateCol: "created_at" },
  { table: "blog_post_views", label: "Vues blog", desc: "articles lus, source de trafic", dateCol: "created_at" },
  { table: "video_views", label: "Vues vidéos", desc: "feed vidéo & fiches", dateCol: "created_at" },
];

const CONSUMERS = [
  { fn: "get_business_analytics", label: "Dashboard Partenaire / B2B", src: "business_events" },
  { fn: "get_blog_analytics", label: "Dashboard Blog", src: "blog_post_views" },
  { fn: "get_showcase_site_stats", label: "Stats site vitrine affilié", src: "business_events" },
  { fn: "get_club_ai_usage_by_user", label: "Coût IA par membre du Club", src: "ai_usage_events" },
  { fn: "get_video_view_count / get_video_like_count", label: "Compteurs vidéo publics", src: "video_views / video_likes" },
];

/** Flux analytics : collecte → agrégation (RPC) → dashboards. */
const AnalyticsFlowPanel = () => {
  const [rows, setRows] = useState<Record<string, { total: number; d30: number }> | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const out: Record<string, { total: number; d30: number }> = {};
      await Promise.all(
        SOURCES.map(async (s) => {
          const sb = supabase as any;
          const [a, b] = await Promise.all([
            sb.from(s.table).select("*", { count: "exact", head: true }),
            sb.from(s.table).select("*", { count: "exact", head: true }).gte(s.dateCol, since),
          ]);
          out[s.table] = { total: a.count || 0, d30: b.count || 0 };
        })
      );
      setRows(out);
    })();
  }, []);

  return (
    <div className="h-full overflow-auto p-4 text-foreground">
      <h3 className="font-bold text-sm mb-2">1 · Collecte (tables d'événements)</h3>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {SOURCES.map((s) => (
          <div key={s.table} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{s.label}</span>
              {rows ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-semibold">
                  {rows[s.table].d30.toLocaleString("fr-FR")} / 30 j
                </span>
              ) : (
                <Loader className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <code className="text-[10px] text-muted-foreground">{s.table}</code>
            <div className="text-[11px] text-muted-foreground mt-1">{s.desc}</div>
            {rows && <div className="text-[10px] mt-1">Total : {rows[s.table].total.toLocaleString("fr-FR")}</div>}
          </div>
        ))}
      </div>

      <h3 className="font-bold text-sm mt-5 mb-2">2 · Agrégation (fonctions SQL security definer)</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {CONSUMERS.map((c) => (
          <div key={c.fn} className="rounded-lg border border-border bg-background p-3 text-[11px]">
            <div className="font-mono font-bold text-xs">{c.fn}()</div>
            <div className="text-muted-foreground">{c.label} ← <code>{c.src}</code></div>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-sm mt-5 mb-2">3 · Restitution</h3>
      <div className="text-[11px] text-muted-foreground leading-relaxed">
        Backoffice (CRM, Blog, IA, B2B) · Dashboard affilié <code>/affiliates/dashboard</code> · Dashboard partenaire B2B · GA4 (chargement asynchrone, mobile-safe) en parallèle du tracking interne.
      </div>
    </div>
  );
};

export default AnalyticsFlowPanel;
