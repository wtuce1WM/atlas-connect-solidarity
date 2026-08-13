import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MousePointerClick, Eye } from "lucide-react";
import { fetchWidgetAnalytics, type WidgetAnalytics } from "@/lib/widgetSettings";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const RANGES = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
];

const WidgetAnalyticsPanel = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<WidgetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchWidgetAnalytics(days)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message || "Erreur"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <Button key={r.days} size="sm" variant={days === r.days ? "default" : "outline"} onClick={() => setDays(r.days)}>
            {r.label}
          </Button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-10">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des mesures…
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Affichages
              </div>
              <div className="text-2xl font-semibold mt-1">{data.total_loads ?? 0}</div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MousePointerClick className="h-3.5 w-3.5" /> Interactions
              </div>
              <div className="text-2xl font-semibold mt-1">{data.total_interactions ?? 0}</div>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Par widget</h3>
            {(data.by_widget || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.by_widget}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="widget_key" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="loads" name="Affichages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interactions" name="Interactions" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Sites hôtes</h3>
              {(data.by_host || []).length === 0 && <p className="text-sm text-muted-foreground">—</p>}
              {(data.by_host || []).map((h) => (
                <div key={h.host} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
                  <span className="font-mono text-xs truncate">{h.host}</span>
                  <span>{h.events}</span>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Appareils</h3>
              {(data.by_device || []).length === 0 && <p className="text-sm text-muted-foreground">—</p>}
              {(data.by_device || []).map((d) => (
                <div key={d.device} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
                  <span>{d.device}</span>
                  <span>{d.events}</span>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Interactions par type</h3>
              {(data.by_action || []).length === 0 && <p className="text-sm text-muted-foreground">—</p>}
              {(data.by_action || []).map((a) => (
                <div key={a.action} className="flex items-center justify-between text-sm border-b border-border/60 py-1">
                  <span className="font-mono text-xs">{a.action}</span>
                  <span>{a.events}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default WidgetAnalyticsPanel;
