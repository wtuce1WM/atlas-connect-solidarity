import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bot, MapPin, Star, ThumbsUp, CloudSun, Waves, LayoutPanelTop, Eye, ExternalLink, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SITE = "https://oneworldmorocco.com";

type Format = "inline" | "floating" | "fullscreen";

const FORMATS: { value: Format; label: string }[] = [
  { value: "inline", label: "Embarqué (inline)" },
  { value: "floating", label: "Panneau flottant" },
  { value: "fullscreen", label: "Plein écran" },
];

type WidgetDef = {
  key: string;
  label: string;
  icon: any;
  /** URL d'aperçu selon le format publié. */
  url: (slug: string | null, format: Format) => string | null;
  height: number;
  formats: Format[];
};

const WIDGETS: WidgetDef[] = [
  {
    key: "ai",
    label: "Assistant IA",
    icon: Bot,
    formats: ["inline", "floating", "fullscreen"],
    height: 640,
    url: (slug, f) =>
      slug ? `${SITE}/embed/ask/${slug}?lang=fr${f === "floating" ? "&variant=panel" : f === "fullscreen" ? "&variant=full" : ""}` : null,
  },
  {
    key: "nearby",
    label: "Adresses à proximité (Map & App)",
    icon: MapPin,
    formats: ["inline", "floating", "fullscreen"],
    height: 620,
    url: (slug, f) =>
      slug ? `${SITE}/embed/nearby/${slug}?lang=fr${f === "floating" ? "&variant=panel" : f === "fullscreen" ? "&variant=full" : ""}` : null,
  },
  {
    key: "reviews",
    label: "Avis clients",
    icon: Star,
    formats: ["inline"],
    height: 480,
    url: (slug) => (slug ? `${SITE}/embed/reviews/${slug}?platform=all&lang=fr` : null),
  },
  {
    key: "rate",
    label: "Laisser un avis",
    icon: ThumbsUp,
    formats: ["inline"],
    height: 380,
    url: (slug) => (slug ? `${SITE}/embed/avis/${slug}?platform=all&lang=fr&variant=card` : null),
  },
  {
    key: "weather",
    label: "Météo",
    icon: CloudSun,
    formats: ["inline"],
    height: 420,
    url: () => `${SITE}/embed/weather?city=Marrakech&lang=fr`,
  },
  {
    key: "tides",
    label: "Marées",
    icon: Waves,
    formats: ["inline"],
    height: 420,
    url: () => `${SITE}/embed/tides?city=Essaouira&lang=fr`,
  },
  {
    key: "fiche",
    label: "ID numérique (type Linktree)",
    icon: LayoutPanelTop,
    formats: ["inline", "fullscreen"],
    height: 760,
    url: (slug) => (slug ? `${SITE}/b/${slug}?embed=1` : null),
  },
];

interface Props {
  businessId: string;
  slug: string | null;
  onGoToWidgets?: () => void;
}

/**
 * Sous-onglet « Publiés » : format d'affichage par défaut, par type de widget,
 * et URL cible où le widget est réellement publié. Le format par défaut sera
 * consommé plus tard par BookOnlineSlidePanel.
 */
const AffiliatePublishedWidgetsPanel = ({ businessId, slug, onGoToWidgets }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, { format: Format; target_url: string }>>({});
  const [saved, setSaved] = useState<Record<string, { format: Format; target_url: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; url: string; height: number; widgetKey: string } | null>(null);
  const [defaultTargetUrl, setDefaultTargetUrl] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const [{ data: pub }, { data: biz }] = await Promise.all([
        supabase
          .from("business_published_widgets")
          .select("widget_key, format, target_url")
          .eq("business_id", businessId),
        supabase.from("businesses").select("showcase_target_url").eq("id", businessId).maybeSingle(),
      ]);
      if (cancel) return;
      const map: Record<string, { format: Format; target_url: string }> = {};
      ((pub as any[]) || []).forEach((r) => {
        map[r.widget_key] = { format: (r.format || "inline") as Format, target_url: r.target_url || "" };
      });
      setRows(map);
      setSaved(map);
      setDefaultTargetUrl(((biz as any)?.showcase_target_url as string) || "");
    })();
    return () => { cancel = true; };
  }, [businessId]);

  const get = (key: string) => rows[key] || { format: "inline" as Format, target_url: "" };

  const set = (key: string, patch: Partial<{ format: Format; target_url: string }>) =>
    setRows((prev) => ({ ...prev, [key]: { ...get(key), ...patch } }));

  const save = async (key: string) => {
    const cur = get(key);
    setSavingKey(key);
    const { error } = await supabase
      .from("business_published_widgets")
      .upsert(
        { business_id: businessId, widget_key: key, format: cur.format, target_url: cur.target_url.trim() || null } as any,
        { onConflict: "business_id,widget_key" },
      );
    setSavingKey(null);
    if (!error) setSaved((prev) => ({ ...prev, [key]: { format: cur.format, target_url: cur.target_url.trim() } }));
    toast(error
      ? { title: "Erreur", description: error.message, variant: "destructive" }
      : { title: "Format publié enregistré" });
  };

  /** État de publication : publié (identique à la base), modifié, ou jamais publié. */
  const pubState = (key: string): "published" | "dirty" | "none" => {
    const s = saved[key];
    if (!s) return "none";
    const cur = get(key);
    return s.format === cur.format && (s.target_url || "") === cur.target_url.trim() ? "published" : "dirty";
  };

  const configured = useMemo(() => Object.keys(rows).length, [rows]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-white font-semibold text-lg">Widgets publiés</h3>
        <p className="text-sm text-white/70">
          Pour chaque type de widget, choisissez le <span className="text-white">format publié par défaut</span> et l'URL
          où il est réellement intégré. Ce format sera repris automatiquement dans la fiche (BookOnlineSlidePanel).
          {configured > 0 && <> {configured} widget{configured > 1 ? "s" : ""} configuré{configured > 1 ? "s" : ""}.</>}
        </p>
        {onGoToWidgets && (
          <button type="button" onClick={onGoToWidgets} className="text-sm text-primary hover:underline">
            Couleurs et réglages détaillés → sous-onglet Widgets
          </button>
        )}
      </div>

      <div className="rounded-lg border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left font-medium text-white/60 px-3 py-2">Widget</th>
              <th className="text-left font-medium text-white/60 px-3 py-2 whitespace-nowrap">Format par défaut</th>
              <th className="text-left font-medium text-white/60 px-3 py-2">URL cible</th>
              <th className="text-left font-medium text-white/60 px-3 py-2 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {WIDGETS.map((w) => {
              const cur = get(w.key);
              const url = w.url(slug, cur.format);
              return (
                <tr key={w.key} className="border-b border-white/5 last:border-0 align-top">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <w.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-white font-medium">{w.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={cur.format}
                        onChange={(e) => set(w.key, { format: e.target.value as Format })}
                        className="h-8 rounded-md bg-white/5 border border-white/15 text-white text-xs px-2"
                      >
                        {FORMATS.filter((f) => w.formats.includes(f.value)).map((f) => (
                          <option key={f.value} value={f.value} className="bg-neutral-900">
                            {f.label}
                          </option>
                        ))}
                      </select>
                      {pubState(w.key) === "published" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/40 whitespace-nowrap">
                          Publié
                        </span>
                      )}
                      {pubState(w.key) === "dirty" && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/40 whitespace-nowrap">
                          Modifié
                        </span>
                      )}
                      {pubState(w.key) === "none" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10 whitespace-nowrap">
                          Non publié
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      value={cur.target_url}
                      onChange={(e) => set(w.key, { target_url: e.target.value })}
                      placeholder={defaultTargetUrl || "https://votredomaine.com/page"}
                      className="h-8 w-full min-w-[200px] rounded-md bg-white/5 border border-white/15 text-white text-xs px-2 placeholder:text-white/30"
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {url && (
                        <button
                          type="button"
                          onClick={() => setPreview({ title: `${w.label} — ${FORMATS.find((f) => f.value === cur.format)?.label}`, url, height: w.height })}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Visualiser
                        </button>
                      )}
                      <Button type="button" size="sm" className="h-7 px-2" onClick={() => save(w.key)} disabled={savingKey === w.key}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl bg-neutral-950 border-white/10 dark">
          <DialogHeader>
            <DialogTitle className="text-white text-base">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-2">
              <iframe
                src={preview.url}
                style={{ width: "100%", height: preview.height, border: 0, borderRadius: 16, background: "transparent" }}
                title={preview.title}
                loading="lazy"
              />
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Ouvrir dans un nouvel onglet <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliatePublishedWidgetsPanel;
