import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, MessageCircle, Phone, Mail, ExternalLink } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props { businessId: string }

type Stats = {
  totals: Record<string, number>;
  series: Array<{ date: string; views: number; clicks: number }>;
  referrers: Array<{ domain: string; count: number }>;
  days: number;
};

const RANGES = [7, 30, 90] as const;

const KPIS: Array<{ key: string; label: string; icon: typeof Eye; color: string }> = [
  { key: "view", label: "Vues", icon: Eye, color: "text-primary" },
  { key: "whatsapp_click", label: "WhatsApp", icon: MessageCircle, color: "text-[#25D366]" },
  { key: "phone_click", label: "Appels", icon: Phone, color: "text-blue-400" },
  { key: "email_click", label: "Emails", icon: Mail, color: "text-purple-400" },
  { key: "booking_intent", label: "Réservations", icon: ExternalLink, color: "text-[#D4AF37]" },
];

export default function ShowcaseSiteStats({ businessId }: Props) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_showcase_site_stats", {
        p_business_id: businessId, p_days: days,
      });
      if (!cancelled) {
        if (error) { console.error(error); setData(null); }
        else setData(data as Stats);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, days]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-semibold text-white">Statistiques du site vitrine</h4>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1 text-xs rounded-full border transition ${days === r ? "bg-[#C04F17] border-[#C04F17] text-white" : "border-white/20 text-white/70 hover:bg-white/10"}`}
            >{r} j</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-white/60" /></div>
      ) : !data ? (
        <p className="text-sm text-white/60">Aucune donnée disponible.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {KPIS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="rounded-md bg-black/40 p-3">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                </div>
                <div className="mt-1 text-xl font-semibold text-white">{data.totals[key] ?? 0}</div>
              </div>
            ))}
          </div>

          {data.series.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="date" stroke="#ffffff60" fontSize={10} />
                  <YAxis stroke="#ffffff60" fontSize={10} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333", fontSize: 12 }} />
                  <Line type="monotone" dataKey="views" stroke="#C04F17" strokeWidth={2} dot={false} name="Vues" />
                  <Line type="monotone" dataKey="clicks" stroke="#25D366" strokeWidth={2} dot={false} name="Clics CTA" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.referrers.length > 0 && (
            <div>
              <div className="text-xs text-white/60 mb-2">Principaux référents externes</div>
              <div className="space-y-1">
                {data.referrers.slice(0, 5).map((r) => (
                  <div key={r.domain} className="flex justify-between text-sm text-white/80">
                    <span className="truncate">{r.domain}</span>
                    <span className="text-white/60">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.totals.view ?? 0) === 0 && (
            <p className="text-xs text-white/50 italic">Aucune vue enregistrée sur cette période. Partagez votre URL /site/… pour commencer à collecter des données.</p>
          )}
        </>
      )}
    </div>
  );
}
