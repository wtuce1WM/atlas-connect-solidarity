import { useMemo, useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, MessageCircle, ExternalLink, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import type { AnalyticsRange, BusinessAnalytics } from "@/hooks/useBusinessAnalytics";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "90d", label: "90 j" },
  { value: "12m", label: "12 mois" },
];

const INTENT_KEYS = [
  "whatsapp_click",
  "phone_click",
  "email_click",
  "directions_click",
  "booking_intent",
];

function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return curr > 0 ? 100 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

function sumTotals(totals: Record<string, number> = {}, keys: string[]) {
  return keys.reduce((s, k) => s + (Number(totals[k]) || 0), 0);
}

export default function AffiliateAggregateStats() {
  const [range, setRange] = useState<AnalyticsRange>("30d");

  const { data: businesses, isLoading: loadingBiz } = useQuery({
    queryKey: ["affiliate-my-businesses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as { id: string; name: string; city: string | null; slug: string | null }[];
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!aff?.id) return [];
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, city, slug")
        .eq("affiliate_id", aff.id)
        .eq("is_active", true)
        .order("name");
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
          p_business_id: b.id,
          p_range: range,
        });
        if (error) throw error;
        return data as unknown as BusinessAnalytics;
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const loading = loadingBiz || analyticsQueries.some((q) => q.isLoading);

  const aggregate = useMemo(() => {
    let views = 0, viewsPrev = 0;
    let intents = 0, intentsPrev = 0;
    let bookings = 0, bookingsPrev = 0;
    const perBusiness: { id: string; name: string; city: string | null; slug: string | null; views: number; intents: number; bookings: number }[] = [];

    (businesses ?? []).forEach((b, i) => {
      const d = analyticsQueries[i]?.data;
      if (!d) {
        perBusiness.push({ ...b, views: 0, intents: 0, bookings: 0 });
        return;
      }
      const v = Number(d.totals?.view) || 0;
      const vp = Number(d.previous_totals?.view) || 0;
      const it = sumTotals(d.totals, INTENT_KEYS);
      const itp = sumTotals(d.previous_totals, INTENT_KEYS);
      const bk = Number(d.totals?.affiliate_click) || 0;
      const bkp = Number(d.previous_totals?.affiliate_click) || 0;
      views += v; viewsPrev += vp;
      intents += it; intentsPrev += itp;
      bookings += bk; bookingsPrev += bkp;
      perBusiness.push({ ...b, views: v, intents: it, bookings: bk });
    });

    perBusiness.sort((a, b) => b.views - a.views);
    return { views, viewsPrev, intents, intentsPrev, bookings, bookingsPrev, perBusiness };
  }, [businesses, analyticsQueries]);

  const cards = [
    { key: "views", label: "Vues totales", icon: Eye, color: "text-primary", bg: "bg-primary/20", curr: aggregate.views, prev: aggregate.viewsPrev },
    { key: "intents", label: "Intentions de contact", icon: MessageCircle, color: "text-green-500", bg: "bg-green-500/20", curr: aggregate.intents, prev: aggregate.intentsPrev },
    { key: "bookings", label: "Clics réservation", icon: ExternalLink, color: "text-gold", bg: "bg-gold/20", curr: aggregate.bookings, prev: aggregate.bookingsPrev },
  ];

  return (
    <div className="space-y-6 mb-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {loading ? "Chargement des statistiques…" : `Cumul sur ${businesses?.length ?? 0} établissement${(businesses?.length ?? 0) > 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-1 bg-card border border-border rounded-md p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "ghost"}
              onClick={() => setRange(r.value)}
              className="h-7 px-3 text-xs"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c) => {
          const delta = deltaPct(c.curr, c.prev);
          const Icon = c.icon;
          return (
            <Card key={c.key} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full ${c.bg} p-3`}>
                    <Icon className={`h-6 w-6 ${c.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? "—" : c.curr.toLocaleString("fr-FR")}
                      </p>
                      {!loading && delta !== null && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${delta >= 0 ? "text-green-500" : "text-destructive"}`}>
                          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(delta)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
