import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Eye, MessageCircle, Phone, Mail, MapPin, ExternalLink, TrendingUp, TrendingDown, Radar } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useBusinessAnalytics, type AnalyticsRange } from "@/hooks/useBusinessAnalytics";
import { trackEvent } from "@/lib/analytics";


interface BusinessOption { id: string; name: string }

interface Props {
  /** Fix selector to a single business (e.g. shown on a fiche). */
  fixedBusinessId?: string;
  /** Limit selector to businesses owned by this affiliate (staff dialog). */
  affiliateId?: string;
  /** Staff mode: search across ALL active businesses. */
  staffAllBusinesses?: boolean;
}

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
];

const KPIS: Array<{ key: string; label: string; icon: typeof Eye; color: string }> = [
  { key: "impression", label: "Impressions", icon: Radar, color: "text-muted-foreground" },
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

export default function BusinessAnalyticsPanel({ fixedBusinessId, affiliateId, staffAllBusinesses }: Props) {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [selectedId, setSelectedId] = useState<string | null>(fixedBusinessId ?? null);
  const [search, setSearch] = useState("");

  const mode: "fixed" | "affiliate" | "staff-all" | "self" = fixedBusinessId
    ? "fixed"
    : affiliateId
    ? "affiliate"
    : staffAllBusinesses
    ? "staff-all"
    : "self";

  const { data: businesses, isLoading: loadingBiz } = useQuery({
    queryKey: ["analytics-businesses", mode, affiliateId ?? null, staffAllBusinesses ? search : ""],
    queryFn: async (): Promise<BusinessOption[]> => {
      if (mode === "affiliate" && affiliateId) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name")
          .eq("affiliate_id", affiliateId)
          .eq("is_active", true)
          .order("name");
        if (error) throw error;
        return (data || []) as BusinessOption[];
      }
      if (mode === "staff-all") {
        let q = supabase.from("businesses").select("id, name").eq("is_active", true).order("name").limit(200);
        if (search.trim().length >= 2) q = q.ilike("name", `%${search.trim()}%`);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []) as BusinessOption[];
      }
      // self (affiliate connected)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!aff?.id) return [];
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("affiliate_id", aff.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as BusinessOption[];
    },
    enabled: mode !== "fixed",
    staleTime: mode === "staff-all" ? 30 * 1000 : 10 * 60 * 1000,
  });

  const activeBusinessId = fixedBusinessId ?? selectedId ?? businesses?.[0]?.id ?? null;

  // Auto-sélection : dès que la liste est chargée, on fixe la valeur (1 seul établissement inclus)
  useEffect(() => {
    if (fixedBusinessId || selectedId) return;
    if (businesses?.length) setSelectedId(businesses[0].id);
  }, [businesses, fixedBusinessId, selectedId]);

  const { data, isLoading, error } = useBusinessAnalytics(activeBusinessId, range);


  const chartData = useMemo(() => (data?.timeseries ?? []).map((d) => ({
    day: new Date(d.day).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    Vues: d.views,
    Intentions: d.intents,
  })), [data]);

  const trackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeBusinessId || !data) return;
    const key = `${mode}|${activeBusinessId}|${range}`;
    if (trackedRef.current === key) return;
    trackedRef.current = key;
    trackEvent("affiliate_drilldown_loaded", {
      mode,
      business_id: activeBusinessId,
      range,
      views: data.totals?.view || 0,
      whatsapp: data.totals?.whatsapp_click || 0,
      phone: data.totals?.phone_click || 0,
      email: data.totals?.email_click || 0,
      directions: data.totals?.directions_click || 0,
      reservations: data.totals?.affiliate_click || 0,
    });
  }, [mode, activeBusinessId, range, data]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {mode === "staff-all" && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un établissement…"
              className="w-full sm:w-[260px]"
            />
          )}
          {mode !== "fixed" && (
            <select
              value={activeBusinessId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                trackEvent("affiliate_drilldown_business_change", { mode, business_id: v, range });
                setSelectedId(v);
              }}
              disabled={loadingBiz || !businesses?.length}
              className="w-full sm:w-[280px] h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground disabled:opacity-50"
            >
              <option value="" disabled>
                {loadingBiz ? "Chargement…" : "Choisir un établissement"}
              </option>
              {businesses?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "ghost"}
              onClick={() => { trackEvent("affiliate_drilldown_range_change", { mode, range: r.value, from: range, business_id: activeBusinessId }); setRange(r.value); }}
              className="h-7 px-3 text-xs"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {!activeBusinessId && !loadingBiz && (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center text-muted-foreground">
            {mode === "affiliate"
              ? "Aucun établissement rattaché à cet affilié."
              : mode === "staff-all"
              ? "Sélectionnez un établissement pour afficher ses statistiques."
              : "Aucun établissement affilié rattaché à votre compte."}
          </CardContent>
        </Card>
      )}


      {activeBusinessId && isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}

      {activeBusinessId && error && (
        <Card className="bg-card border-border">
          <CardContent className="py-6 text-center text-destructive text-sm">
            {(error as Error).message || "Erreur de chargement"}
          </CardContent>
        </Card>
      )}

      {activeBusinessId && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {KPIS.map((kpi) => {
              const curr = data.totals[kpi.key] || 0;
              const prev = data.previous_totals[kpi.key] || 0;
              const delta = deltaPct(curr, prev);
              const Icon = kpi.icon;
              return (
                <Card key={kpi.key} className="bg-card border-border">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                      {delta !== null && (
                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${delta >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(delta)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-foreground leading-tight">{curr.toLocaleString("fr-FR")}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Évolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Line type="monotone" dataKey="Vues" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Intentions" stroke="#C04F17" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BreakdownCard title="Pays" rows={data.by_country} labelKey="country" />
            <BreakdownCard title="Appareil" rows={data.by_device} labelKey="device" />
            <BreakdownCard title="Pages d'origine" rows={data.by_source_page} labelKey="source_page" />
          </div>
        </>
      )}
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
