import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2 } from "lucide-react";
import WidgetHexField from "./WidgetHexField";
import { FIT_OPTIONS } from "@/lib/embedFit";
import {
  buildWidgetUrl,
  deleteWidgetOverride,
  fetchBusinessWidgetOverrides,
  fetchWidgetCatalog,
  fetchWidgetDefaults,
  resolveWidgetSettings,
  saveWidgetOverride,
  type WidgetDefaults,
  type WidgetOverride,
  type WidgetType,
} from "@/lib/widgetSettings";

type Biz = { id: string; name: string; slug: string; widget_bg_color: string | null; widget_bg_color_dark: string | null };

type Draft = {
  bg_light: string;
  bg_dark: string;
  card_mode: string;
  theme: string;
  fit: string;
  height: string;
  max_width: string;
  radius: string;
  lang: string;
};

const EMPTY: Draft = { bg_light: "", bg_dark: "", card_mode: "", theme: "", fit: "", height: "", max_width: "", radius: "", lang: "" };

const toDraft = (o?: WidgetOverride | null): Draft =>
  o
    ? {
        bg_light: o.bg_light || "",
        bg_dark: o.bg_dark || "",
        card_mode: o.card_mode || "",
        theme: o.theme || "",
        fit: o.fit || "",
        height: o.height != null ? String(o.height) : "",
        max_width: o.max_width != null ? String(o.max_width) : "",
        radius: o.radius != null ? String(o.radius) : "",
        lang: o.lang || "",
      }
    : { ...EMPTY };

const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const WidgetOverridesPanel = () => {
  const [catalog, setCatalog] = useState<WidgetType[]>([]);
  const [defaults, setDefaults] = useState<Record<string, WidgetDefaults>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Biz[]>([]);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [overrides, setOverrides] = useState<Record<string, WidgetOverride>>({});
  const [activeKey, setActiveKey] = useState("");
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, d] = await Promise.all([fetchWidgetCatalog(), fetchWidgetDefaults()]);
      setCatalog(c);
      setDefaults(d);
      setActiveKey(c[0]?.widget_key || "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) return setResults([]);
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id, name, slug, widget_bg_color, widget_bg_color_dark")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(12);
      setResults((data || []) as Biz[]);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const selectBiz = async (b: Biz) => {
    setBiz(b);
    setResults([]);
    setQuery(b.name);
    const o = await fetchBusinessWidgetOverrides(b.id);
    setOverrides(o);
    setDraft(toDraft(o[activeKey]));
  };

  const selectWidget = (key: string) => {
    setActiveKey(key);
    setDraft(toDraft(overrides[key]));
  };

  const resolved = useMemo(
    () =>
      resolveWidgetSettings(activeKey, defaults[activeKey], {
        bg_light: draft.bg_light || null,
        bg_dark: draft.bg_dark || null,
        card_mode: draft.card_mode || null,
        theme: draft.theme || null,
        fit: draft.fit || null,
        height: draft.height ? Number(draft.height) : null,
        max_width: draft.max_width ? Number(draft.max_width) : null,
        radius: draft.radius ? Number(draft.radius) : null,
        lang: draft.lang || null,
        options: {},
      }),
    [activeKey, defaults, draft],
  );

  const widget = catalog.find((w) => w.widget_key === activeKey);
  const previewUrl = widget && biz ? buildWidgetUrl(widget, resolved, { origin: window.location.origin, slug: biz.slug }) : "";

  const save = async () => {
    if (!biz) return;
    setSaving(true);
    try {
      await saveWidgetOverride(biz.id, activeKey, {
        bg_light: draft.bg_light || null,
        bg_dark: draft.bg_dark || null,
        card_mode: draft.card_mode || null,
        theme: draft.theme || null,
        fit: draft.fit || null,
        height: draft.height ? Number(draft.height) : null,
        max_width: draft.max_width ? Number(draft.max_width) : null,
        radius: draft.radius ? Number(draft.radius) : null,
        lang: draft.lang || null,
      });
      setOverrides(await fetchBusinessWidgetOverrides(biz.id));
      toast({ title: "Surcharge enregistrée" });
    } catch (e: any) {
      toast({ title: "Échec", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!biz) return;
    await deleteWidgetOverride(biz.id, activeKey);
    setOverrides(await fetchBusinessWidgetOverrides(biz.id));
    setDraft({ ...EMPTY });
    toast({ title: "Surcharge supprimée — retour au défaut global" });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="max-w-md space-y-1.5 relative">
        <Label className="text-xs">Établissement</Label>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou slug…" />
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-72 overflow-auto">
            {results.map((r) => (
              <button key={r.id} onClick={() => selectBiz(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                <div className="font-medium">{r.name}</div>
                <div className="text-[11px] font-mono text-muted-foreground">{r.slug}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!biz && <p className="text-sm text-muted-foreground">Sélectionnez un établissement pour gérer ses surcharges de widgets.</p>}

      {biz && (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr_340px]">
          <div className="space-y-1">
            {catalog.map((w) => (
              <button
                key={w.widget_key}
                onClick={() => selectWidget(w.widget_key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between gap-2 ${
                  w.widget_key === activeKey ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                <span>{w.label}</span>
                {overrides[w.widget_key] && <Badge variant="secondary" className="text-[10px]">Surchargé</Badge>}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Laissez un champ vide pour hériter du défaut global. Valeurs héritées appliquées :{" "}
              <span className="font-mono">
                fond {resolved.bgLight || "transparent"} / {resolved.bgDark || "transparent"} · {resolved.height}px · fit «{resolved.fit || "auto"}»
              </span>
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <WidgetHexField label="Fond — mode clair" value={draft.bg_light} onChange={(v) => setDraft({ ...draft, bg_light: v })} />
              <WidgetHexField label="Fond — mode sombre" value={draft.bg_dark} onChange={(v) => setDraft({ ...draft, bg_dark: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">Application du fond</Label>
                <Select
                  value={draft.card_mode}
                  onChange={(v) => setDraft({ ...draft, card_mode: v })}
                  options={[
                    { value: "", label: "Hériter" },
                    { value: "widget", label: "Carte colorée" },
                    { value: "transparent", label: "Page transparente + carte" },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Thème</Label>
                <Select
                  value={draft.theme}
                  onChange={(v) => setDraft({ ...draft, theme: v })}
                  options={[
                    { value: "", label: "Hériter" },
                    { value: "light", label: "Clair" },
                    { value: "dark", label: "Sombre" },
                  ]}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Dimensions</Label>
                <Select
                  value={draft.fit}
                  onChange={(v) => setDraft({ ...draft, fit: v })}
                  options={[{ value: "", label: "Hériter" }, ...FIT_OPTIONS.filter((o) => o.value).map((o) => ({ value: o.value as string, label: o.label }))]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hauteur (px)</Label>
                <Input value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} placeholder="hériter" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Largeur max (px)</Label>
                <Input value={draft.max_width} onChange={(e) => setDraft({ ...draft, max_width: e.target.value })} placeholder="hériter" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrondi (px)</Label>
                <Input value={draft.radius} onChange={(e) => setDraft({ ...draft, radius: e.target.value })} placeholder="hériter" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Langue</Label>
                <Select
                  value={draft.lang}
                  onChange={(v) => setDraft({ ...draft, lang: v })}
                  options={[
                    { value: "", label: "Hériter" },
                    { value: "fr", label: "Français" },
                    { value: "en", label: "Anglais" },
                    { value: "ar", label: "Arabe" },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
              {overrides[activeKey] && (
                <Button variant="ghost" onClick={remove}>
                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer la surcharge
                </Button>
              )}
            </div>

            {(biz.widget_bg_color || biz.widget_bg_color_dark) && (
              <p className="text-[11px] text-muted-foreground font-mono">
                Anciennes couleurs fiche : clair {biz.widget_bg_color || "—"} · sombre {biz.widget_bg_color_dark || "—"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Aperçu live</div>
            <div className="rounded-xl border border-border p-3" style={{ background: "#e5e7eb" }}>
              {previewUrl && (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  title="Aperçu widget établissement"
                  style={{
                    width: "100%",
                    display: "block",
                    maxWidth: resolved.fit === "w" || resolved.fit === "wh" ? undefined : resolved.maxWidth || undefined,
                    height: resolved.height,
                    border: 0,
                    borderRadius: resolved.radius,
                    background: "transparent",
                    margin: "0 auto",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetOverridesPanel;
