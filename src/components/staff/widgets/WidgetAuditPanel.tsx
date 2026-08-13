import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  fetchWidgetCatalog,
  fetchWidgetDefaults,
  normalizeHex,
  resolveWidgetSettings,
  type WidgetDefaults,
  type WidgetType,
} from "@/lib/widgetSettings";

type Row = {
  business_id: string;
  name: string;
  slug: string;
  widget_bg_color: string | null;
  widget_bg_color_dark: string | null;
  keys: string[];
};

const WidgetAuditPanel = () => {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<WidgetType[]>([]);
  const [defaults, setDefaults] = useState<Record<string, WidgetDefaults>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [published, setPublished] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [c, d, over, pub] = await Promise.all([
        fetchWidgetCatalog(),
        fetchWidgetDefaults(),
        (supabase as any)
          .from("business_widget_settings")
          .select("business_id, widget_key, businesses(name, slug, widget_bg_color, widget_bg_color_dark)"),
        (supabase as any).from("business_published_widgets").select("widget_key"),
      ]);
      setCatalog(c);
      setDefaults(d);

      const map = new Map<string, Row>();
      ((over as any).data || []).forEach((r: any) => {
        const cur =
          map.get(r.business_id) ||
          ({
            business_id: r.business_id,
            name: r.businesses?.name || "—",
            slug: r.businesses?.slug || "",
            widget_bg_color: r.businesses?.widget_bg_color || null,
            widget_bg_color_dark: r.businesses?.widget_bg_color_dark || null,
            keys: [],
          } as Row);
        cur.keys.push(r.widget_key);
        map.set(r.business_id, cur);
      });
      setRows([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));

      const counts: Record<string, number> = {};
      ((pub as any).data || []).forEach((r: any) => {
        counts[r.widget_key] = (counts[r.widget_key] || 0) + 1;
      });
      setPublished(counts);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Audit en cours…
      </div>
    );
  }

  const anomalies = catalog.flatMap((w) => {
    const s = resolveWidgetSettings(w.widget_key, defaults[w.widget_key], null);
    const out: string[] = [];
    if (!normalizeHex(s.bgLight)) out.push("aucune couleur de fond en mode clair (fond transparent)");
    if (!normalizeHex(s.bgDark)) out.push("aucune couleur de fond en mode sombre");
    if (s.fit === "" && !s.maxWidth) out.push("ni largeur max ni mode d'ajustement → rendu dépendant du site hôte");
    if (s.height < 200) out.push(`hauteur très faible (${s.height}px)`);
    return out.map((msg) => ({ widget: w.label, msg }));
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Cohérence des défauts</h3>
        {anomalies.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Aucune anomalie détectée.
          </div>
        ) : (
          <div className="space-y-1.5">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  <strong>{a.widget}</strong> — {a.msg}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Publication par widget</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((w) => {
            const s = resolveWidgetSettings(w.widget_key, defaults[w.widget_key], null);
            return (
              <div key={w.widget_key} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{w.label}</span>
                  <Badge variant="secondary">{published[w.widget_key] || 0} publié(s)</Badge>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">
                  {s.bgLight || "transparent"} / {s.bgDark || "transparent"} · {s.height}px · {s.maxWidth ? `${s.maxWidth}px max` : "pleine largeur"} · fit «{s.fit || "auto"}»
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Établissements avec surcharges ({rows.length})</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune surcharge : tous les widgets utilisent les défauts globaux.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">Établissement</th>
                  <th className="py-2 pr-4">Widgets surchargés</th>
                  <th className="py-2">Couleurs fiche (legacy)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.business_id} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{r.slug}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {r.keys.map((k) => (
                          <Badge key={k} variant="outline" className="text-[10px]">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-[11px] font-mono text-muted-foreground">
                      {r.widget_bg_color || "—"} / {r.widget_bg_color_dark || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default WidgetAuditPanel;
