import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, MessageCircle, Phone, Mail, MapPin, ExternalLink, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { AnalyticsRange, BusinessAnalytics } from "@/hooks/useBusinessAnalytics";
import { trackEvent } from "@/lib/analytics";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "90d", label: "90 j" },
  { value: "12m", label: "12 mois" },
];

const KPIS: Array<{ key: string; label: string; icon: typeof Eye; color: string }> = [
  { key: "view", label: "Vues", icon: Eye, color: "text-primary" },
  { key: "whatsapp_click", label: "WhatsApp", icon: MessageCircle, color: "text-green-500" },
  { key: "phone_click", label: "Appels", icon: Phone, color: "text-blue-500" },
  { key: "email_click", label: "Emails", icon: Mail, color: "text-purple-500" },
  { key: "directions_click", label: "Itinéraires", icon: MapPin, color: "text-orange-500" },
  { key: "affiliate_click", label: "Réservations", icon: ExternalLink, color: "text-gold" },
];

function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

export default function AffiliateAggregateStats() {
  const [range, setRange] = useState<AnalyticsRange>("30d");

  const { data: businesses, isLoading: loadingBiz } = useQuery({
    queryKey: ["affiliate-my-businesses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as { id: string; name: string; city: string | null; slug: string | null }[];
      const { data: aff } = await supabase
        .from("affiliates").select("id").eq("user_id", user.id).maybeSingle();
      if (!aff?.id) return [];
      const { data, error } = await supabase
        .from("businesses").select("id, name, city, slug")
        .eq("affiliate_id", aff.id).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const analyticsQueries = useQueries({
    queries: (businesses ?? []).map((b) => ({
      queryKey: ["business-analytics", b.id, range],
      queryFn: async (): Promise<BusinessAnalytics> => {
        const { data, error } = await supabase.rpc("get_business_analytics", {
          p_business_id: b.id, p_range: range,
        });
        if (error) throw error;
        return data as unknown as BusinessAnalytics;
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const loading = loadingBiz || analyticsQueries.some((q) => q.isLoading);

  const aggregate = useMemo(() => {
    const totals: Record<string, number> = {};
    const prevTotals: Record<string, number> = {};
    const tsMap = new Map<string, { views: number; intents: number }>();
    const prevTsList: Array<{ views: number; intents: number }> = [];
    const byCountry = new Map<string, number>();
    const byDevice = new Map<string, number>();
    const bySource = new Map<string, number>();
    const byReferrer = new Map<string, number>();
    const perBusiness: { id: string; name: string; city: string | null; slug: string | null; views: number; intents: number; bookings: number; convRate: number; bookingRate: number }[] = [];

    (businesses ?? []).forEach((b, i) => {
      const d = analyticsQueries[i]?.data;
      if (!d) { perBusiness.push({ ...b, views: 0, intents: 0, bookings: 0, convRate: 0, bookingRate: 0 }); return; }
      for (const k of KPIS.map((x) => x.key)) {
        totals[k] = (totals[k] || 0) + (Number(d.totals?.[k]) || 0);
        prevTotals[k] = (prevTotals[k] || 0) + (Number(d.previous_totals?.[k]) || 0);
      }
      (d.timeseries || []).forEach((r) => {
        const cur = tsMap.get(r.day) || { views: 0, intents: 0 };
        cur.views += r.views || 0; cur.intents += r.intents || 0;
        tsMap.set(r.day, cur);
      });
      // Previous timeseries aligned by index (day-of-period), summed across businesses
      const prev = d.previous_timeseries || [];
      prev.forEach((r, idx) => {
        if (!prevTsList[idx]) prevTsList[idx] = { views: 0, intents: 0 };
        prevTsList[idx].views += r.views || 0;
        prevTsList[idx].intents += r.intents || 0;
      });
      (d.by_country || []).forEach((r) => byCountry.set(r.country, (byCountry.get(r.country) || 0) + (Number(r.c) || 0)));
      (d.by_device || []).forEach((r) => byDevice.set(r.device, (byDevice.get(r.device) || 0) + (Number(r.c) || 0)));
      (d.by_source_page || []).forEach((r) => bySource.set(r.source_page, (bySource.get(r.source_page) || 0) + (Number(r.c) || 0)));
      (d.top_referrers || []).forEach((r) => byReferrer.set(r.referrer_domain, (byReferrer.get(r.referrer_domain) || 0) + (Number(r.c) || 0)));

      const v = Number(d.totals?.view) || 0;
      const it = ["whatsapp_click","phone_click","email_click","directions_click","booking_intent"]
        .reduce((s,k)=>s+(Number(d.totals?.[k])||0),0);
      const bk = Number(d.totals?.affiliate_click) || 0;
      perBusiness.push({
        ...b, views: v, intents: it, bookings: bk,
        convRate: v > 0 ? Math.round((it / v) * 1000) / 10 : 0,
        bookingRate: v > 0 ? Math.round((bk / v) * 1000) / 10 : 0,
      });
    });

    const sortedDays = Array.from(tsMap.keys()).sort();
    const timeseries = sortedDays.map((day, idx) => {
      const cur = tsMap.get(day)!;
      const prev = prevTsList[idx];
      return {
        day: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        Vues: cur.views,
        Intentions: cur.intents,
        "Vues N-1": prev?.views ?? null,
        "Intentions N-1": prev?.intents ?? null,
      };
    });

    const toRows = (m: Map<string, number>, key: string) =>
      Array.from(m.entries())
        .map(([k, c]) => ({ [key]: k, c }))
        .sort((a, b) => (b.c as number) - (a.c as number));

    perBusiness.sort((a, b) => b.views - a.views);

    return {
      totals, prevTotals, timeseries,
      by_country: toRows(byCountry, "country"),
      by_device: toRows(byDevice, "device"),
      by_source_page: toRows(bySource, "source_page"),
      top_referrers: toRows(byReferrer, "referrer_domain"),
      perBusiness,
    };
  }, [businesses, analyticsQueries]);

  const conversionRates = useMemo(() => {
    const v = aggregate.totals.view || 0;
    const it = ["whatsapp_click","phone_click","email_click","directions_click","booking_intent"]
      .reduce((s,k)=>s+(aggregate.totals[k]||0),0);
    const bk = aggregate.totals.affiliate_click || 0;
    const pv = aggregate.prevTotals.view || 0;
    const pit = ["whatsapp_click","phone_click","email_click","directions_click","booking_intent"]
      .reduce((s,k)=>s+(aggregate.prevTotals[k]||0),0);
    const pbk = aggregate.prevTotals.affiliate_click || 0;
    return {
      intentRate: v > 0 ? (it / v) * 100 : 0,
      bookingRate: v > 0 ? (bk / v) * 100 : 0,
      prevIntentRate: pv > 0 ? (pit / pv) * 100 : 0,
      prevBookingRate: pv > 0 ? (pbk / pv) * 100 : 0,
    };
  }, [aggregate]);


  const trackedLoadRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = `${range}|${businesses?.length ?? 0}`;
    if (trackedLoadRef.current === key) return;
    trackedLoadRef.current = key;
    trackEvent("affiliate_stats_loaded", {
      range,
      businesses_count: businesses?.length ?? 0,
      views: aggregate.totals.view || 0,
      whatsapp: aggregate.totals.whatsapp_click || 0,
      phone: aggregate.totals.phone_click || 0,
      email: aggregate.totals.email_click || 0,
      directions: aggregate.totals.directions_click || 0,
      reservations: aggregate.totals.affiliate_click || 0,
      countries_count: aggregate.by_country.length,
      devices_count: aggregate.by_device.length,
      source_pages_count: aggregate.by_source_page.length,
    });
  }, [loading, range, businesses, aggregate]);


  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {loading ? "Chargement des statistiques…" : `Cumul sur ${businesses?.length ?? 0} établissement${(businesses?.length ?? 0) > 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {RANGES.map((r) => (
            <Button key={r.value} size="sm" variant={range === r.value ? "default" : "ghost"}
              onClick={() => { trackEvent("affiliate_stats_range_change", { range: r.value, scope: "aggregate", from: range }); setRange(r.value); }} className="h-7 px-3 text-xs">
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPIS.map((kpi) => {
          const curr = aggregate.totals[kpi.key] || 0;
          const prev = aggregate.prevTotals[kpi.key] || 0;
          const delta = deltaPct(curr, prev);
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-1">
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                  {!loading && delta !== null && (
                    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${delta >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(delta)}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-foreground leading-tight">
                  {loading ? "—" : curr.toLocaleString("fr-FR")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Evolution chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-foreground">Évolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregate.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="Vues" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Intentions" stroke="#C04F17" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownCard title="Pays" rows={aggregate.by_country} labelKey="country" />
        <BreakdownCard title="Appareil" rows={aggregate.by_device} labelKey="device" />
        <BreakdownCard title="Pages d'origine" rows={aggregate.by_source_page} labelKey="source_page" />
      </div>

      {/* Businesses list */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Mes établissements</CardTitle>
              <CardDescription className="text-muted-foreground">
                Performance sur la période sélectionnée
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
          )}
          {!loading && aggregate.perBusiness.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun établissement rattaché à votre compte affilié.
            </p>
          )}
          {!loading && aggregate.perBusiness.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3 font-medium">Établissement</th>
                    <th className="py-2 px-3 font-medium text-right">Vues</th>
                    <th className="py-2 px-3 font-medium text-right">Intentions</th>
                    <th className="py-2 pl-3 font-medium text-right">Réservations</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregate.perBusiness.map((b) => (
                    <tr key={b.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="text-foreground font-medium">{b.name}</div>
                        {b.city && <div className="text-xs text-muted-foreground">{b.city}</div>}
                      </td>
                      <td className="py-2 px-3 text-right text-foreground tabular-nums">{b.views.toLocaleString("fr-FR")}</td>
                      <td className="py-2 px-3 text-right text-foreground tabular-nums">{b.intents.toLocaleString("fr-FR")}</td>
                      <td className="py-2 pl-3 text-right text-foreground tabular-nums">{b.bookings.toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownCard({ title, rows, labelKey }: { title: string; rows: Array<Record<string, unknown>>; labelKey: string }) {
  const total = rows.reduce((s, r) => s + (Number(r.c) || 0), 0) || 1;
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée</p>}
        {rows.slice(0, 8).map((r, i) => {
          const label = String(r[labelKey] ?? "—");
          const c = Number(r.c) || 0;
          const pct = Math.round((c / total) * 100);
          return (
            <div key={i} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-foreground truncate flex-1" title={label}>{label}</span>
                <span className="text-muted-foreground tabular-nums">{c} · {pct}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
