import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Check, Copy, Loader2, RotateCcw, Save } from "lucide-react";
import WidgetHexField from "./WidgetHexField";
import { FIT_OPTIONS } from "@/lib/embedFit";
import {
  buildWidgetSnippet,
  buildWidgetUrl,
  fetchWidgetCatalog,
  fetchWidgetDefaults,
  resolveWidgetSettings,
  saveWidgetDefaults,
  type WidgetDefaults,
  type WidgetSettingsFields,
  type WidgetType,
} from "@/lib/widgetSettings";

type Draft = {
  bg_light: string;
  bg_dark: string;
  card_mode: string;
  theme: string;
  fit: string;
  height: number;
  max_width: number | null;
  radius: number;
  lang: string;
};

const toDraft = (d?: WidgetDefaults | null): Draft => ({
  bg_light: d?.bg_light || "",
  bg_dark: d?.bg_dark || "",
  card_mode: d?.card_mode || "widget",
  theme: d?.theme || "light",
  fit: d?.fit || "",
  height: d?.height ?? 480,
  max_width: d?.max_width ?? null,
  radius: d?.radius ?? 20,
  lang: d?.lang || "fr",
});

const CARD_MODES = [
  { value: "widget", label: "Carte colorée (fond opaque)" },
  { value: "transparent", label: "Page transparente + carte colorée" },
];

const Select = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

type Biz = { id: string; name: string; slug: string };

const DEFAULT_BIZ: Biz = { id: "3bb71910-c17e-4ce1-a130-42c369a645a7", name: "La Mamounia", slug: "la-mamounia" };

const WidgetSettingsPanel = () => {
  const [catalog, setCatalog] = useState<WidgetType[]>([]);
  const [defaults, setDefaults] = useState<Record<string, WidgetDefaults>>({});
  const [activeKey, setActiveKey] = useState<string>("");
  const [draft, setDraft] = useState<Draft>(toDraft(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [biz, setBiz] = useState<Biz>(DEFAULT_BIZ);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Biz[]>([]);
  const slug = biz.slug;

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) return setResults([]);
      const { data } = await (supabase as any)
        .from("businesses")
        .select("id, name, slug")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(12);
      setResults((data || []) as Biz[]);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);


  const load = async () => {
    setLoading(true);
    const [c, d] = await Promise.all([fetchWidgetCatalog(), fetchWidgetDefaults()]);
    setCatalog(c);
    setDefaults(d);
    const key = activeKey || c[0]?.widget_key || "";
    setActiveKey(key);
    setDraft(toDraft(d[key]));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const widget = catalog.find((w) => w.widget_key === activeKey);

  const resolved = useMemo(
    () => resolveWidgetSettings(activeKey, draft as unknown as WidgetSettingsFields, null),
    [activeKey, draft],
  );

  const previewUrl = widget
    ? buildWidgetUrl(widget, resolved, { origin: window.location.origin, slug })
    : "";
  const publicUrl = widget ? buildWidgetUrl(widget, resolved, { slug }) : "";
  const snippet = widget ? buildWidgetSnippet(publicUrl, resolved, widget.label) : "";

  const dirty = useMemo(() => {
    const base = toDraft(defaults[activeKey]);
    return JSON.stringify(base) !== JSON.stringify(draft);
  }, [defaults, activeKey, draft]);

  const selectWidget = (key: string) => {
    if (dirty && !window.confirm("Modifications non enregistrées. Changer de widget ?")) return;
    setActiveKey(key);
    setDraft(toDraft(defaults[key]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveWidgetDefaults(activeKey, {
        bg_light: draft.bg_light || null,
        bg_dark: draft.bg_dark || null,
        card_mode: draft.card_mode,
        theme: draft.theme,
        fit: draft.fit,
        height: draft.height,
        max_width: draft.max_width,
        radius: draft.radius,
        lang: draft.lang,
      });
      const d = await fetchWidgetDefaults();
      setDefaults(d);
      toast({ title: "Réglages enregistrés" });
    } catch (e: any) {
      toast({ title: "Échec de l'enregistrement", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement des widgets…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr_360px]">
      {/* Catalogue */}
      <div className="space-y-1">
        {catalog.map((w) => (
          <button
            key={w.widget_key}
            onClick={() => selectWidget(w.widget_key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              w.widget_key === activeKey ? "bg-foreground text-background" : "hover:bg-muted"
            }`}
          >
            <div className="font-medium">{w.label}</div>
            <div className={`text-[11px] font-mono ${w.widget_key === activeKey ? "text-background/60" : "text-muted-foreground"}`}>
              {w.widget_key}
            </div>
          </button>
        ))}
      </div>

      {/* Formulaire */}
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold">{widget?.label}</h3>
          <p className="text-sm text-muted-foreground">{widget?.description}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">{widget?.embed_path}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <WidgetHexField label="Fond — mode clair" value={draft.bg_light} onChange={(v) => setDraft({ ...draft, bg_light: v })} />
          <WidgetHexField label="Fond — mode sombre" value={draft.bg_dark} onChange={(v) => setDraft({ ...draft, bg_dark: v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Application du fond</Label>
            <Select value={draft.card_mode} onChange={(v) => setDraft({ ...draft, card_mode: v })} options={CARD_MODES} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Thème par défaut</Label>
            <Select
              value={draft.theme}
              onChange={(v) => setDraft({ ...draft, theme: v })}
              options={[
                { value: "light", label: "Clair" },
                { value: "dark", label: "Sombre" },
              ]}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Dimensions dans l'iframe hôte</Label>
            <Select
              value={draft.fit}
              onChange={(v) => setDraft({ ...draft, fit: v })}
              options={FIT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hauteur (px)</Label>
            <Input
              type="number"
              value={draft.height}
              onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Largeur max (px, vide = pleine largeur)</Label>
            <Input
              type="number"
              value={draft.max_width ?? ""}
              onChange={(e) => setDraft({ ...draft, max_width: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Arrondi (px)</Label>
            <Input
              type="number"
              value={draft.radius}
              onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Langue par défaut</Label>
            <Select
              value={draft.lang}
              onChange={(v) => setDraft({ ...draft, lang: v })}
              options={[
                { value: "fr", label: "Français" },
                { value: "en", label: "Anglais" },
                { value: "ar", label: "Arabe" },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer les défauts
          </Button>
          <Button variant="ghost" onClick={() => setDraft(toDraft(defaults[activeKey]))} disabled={!dirty}>
            <RotateCcw className="h-4 w-4 mr-2" /> Annuler
          </Button>
          {dirty && <Badge variant="secondary">Non enregistré</Badge>}
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">Code d'intégration (domaine public)</div>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
            <code>{snippet}</code>
          </pre>
        </div>
      </div>

      {/* Aperçu live */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground">Aperçu live</div>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="h-8 w-40 text-xs" placeholder="slug démo" />
        </div>
        <div className="rounded-xl border border-border p-3" style={{ background: "#e5e7eb" }}>
          {previewUrl && (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Aperçu widget"
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
        <p className="text-[11px] font-mono text-muted-foreground break-all">{publicUrl}</p>
      </div>
    </div>
  );
};

export default WidgetSettingsPanel;
