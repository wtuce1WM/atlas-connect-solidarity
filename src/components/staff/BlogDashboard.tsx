import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Eye, Users, Bookmark, Languages } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Range = 7 | 30 | 90;

interface BlogAnalytics {
  days: number;
  since: string;
  total_views: number;
  previous_total_views: number;
  unique_sessions: number;
  by_post: Array<{ slug: string; title: string; is_published: boolean; views: number; sessions: number; bookmarks: number }>;
  timeseries: Array<{ day: string; views: number }>;
  by_language: Array<{ language: string; c: number }>;
  by_device: Array<{ device: string; c: number }>;
  top_referrers: Array<{ referrer_domain: string; c: number }>;
  by_source: Array<{ source: string; c: number }>;
  catalog: { total: number; published: number; pinned: number; with_en: number; with_ar: number };
}

const RANGES: { label: string; value: Range }[] = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "90 jours", value: 90 },
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
  delta,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
  hint?: string;
  delta?: number | null;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      {typeof delta === "number" && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            delta >= 0 ? "text-emerald-600" : "text-destructive"
          }`}
        >
          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta >= 0 ? "+" : ""}
          {delta}% vs période précédente
        </div>
      )}
    </CardContent>
  </Card>
);

const BreakdownList = ({
  title,
  rows,
  emptyLabel = "Aucune donnée",
}: {
  title: string;
  rows: Array<{ label: string; c: number }>;
  emptyLabel?: string;
}) => {
  const max = Math.max(1, ...rows.map((r) => r.c));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">{emptyLabel}</p>}
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="truncate">{r.label}</span>
              <span className="text-muted-foreground">{r.c}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(r.c / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const BlogDashboard = () => {
  const [range, setRange] = useState<Range>(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["blog-analytics", range],
    queryFn: async (): Promise<BlogAnalytics> => {
      const { data, error } = await supabase.rpc("get_blog_analytics", { p_days: range });
      if (error) throw error;
      return data as unknown as BlogAnalytics;
    },
    staleTime: 2 * 60 * 1000,
  });

  const delta = useMemo(() => {
    if (!data) return null;
    if (!data.previous_total_views) return data.total_views > 0 ? 100 : 0;
    return Math.round(((data.total_views - data.previous_total_views) / data.previous_total_views) * 100);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-destructive py-10 text-center">
        Impossible de charger les statistiques du blog.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Fréquentation des articles</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "outline"}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Eye} label="Vues d'articles" value={data.total_views} delta={delta} />
        <StatCard icon={Users} label="Lecteurs uniques" value={data.unique_sessions} />
        <StatCard
          icon={Bookmark}
          label="Articles publiés"
          value={`${data.catalog.published}/${data.catalog.total}`}
          hint={`${data.catalog.pinned} épinglé(s)`}
        />
        <StatCard
          icon={Languages}
          label="Traductions"
          value={`EN ${data.catalog.with_en} · AR ${data.catalog.with_ar}`}
          hint={`sur ${data.catalog.total} articles`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Évolution des vues</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {data.timeseries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucune vue enregistrée sur la période. Le suivi démarre dès la prochaine visite d'un article.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeseries}>
                <defs>
                  <linearGradient id="blogViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  fill="url(#blogViews)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Classement des articles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.by_post.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4">Aucune vue enregistrée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Article</th>
                    <th className="text-right p-3">Vues</th>
                    <th className="text-right p-3">Lecteurs</th>
                    <th className="text-right p-3">Favoris</th>
                    <th className="text-right p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_post.map((p) => (
                    <tr key={p.slug} className="border-t">
                      <td className="p-3">
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-medium"
                        >
                          {p.title}
                        </a>
                        <div className="text-xs text-muted-foreground">/{p.slug}</div>
                      </td>
                      <td className="p-3 text-right font-semibold">{p.views}</td>
                      <td className="p-3 text-right">{p.sessions}</td>
                      <td className="p-3 text-right">{p.bookmarks}</td>
                      <td className="p-3 text-right">
                        <Badge variant={p.is_published ? "default" : "secondary"}>
                          {p.is_published ? "Publié" : "Hors ligne"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <BreakdownList
          title="Langues de lecture"
          rows={data.by_language.map((r) => ({ label: r.language.toUpperCase(), c: r.c }))}
        />
        <BreakdownList title="Appareils" rows={data.by_device.map((r) => ({ label: r.device, c: r.c }))} />
        <BreakdownList
          title="Contexte de lecture"
          rows={data.by_source.map((r) => ({ label: r.source, c: r.c }))}
        />
        <BreakdownList
          title="Sites référents"
          rows={data.top_referrers.map((r) => ({ label: r.referrer_domain, c: r.c }))}
          emptyLabel="Aucun référent externe"
        />
      </div>
    </div>
  );
};

export default BlogDashboard;
