import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Plus, ArrowUp, ArrowDown, Lock, ExternalLink } from "lucide-react";
import RichTextEditor from "@/components/staff/RichTextEditor";

interface AiText {
  id: string;
  title: string;
  hook: string;
  content: string;
  source_mode: string;
  position: number;
  is_active: boolean;
  extra_instructions: string | null;
  length_mode: string | null;
  style_mode: string | null;
  include_prices: boolean | null;
}

const SELECT_COLS =
  "id,title,hook,content,source_mode,position,is_active,extra_instructions,length_mode,style_mode,include_prices";

const MAX_TEXTS = 10;
const MAX_CONTENT = 2000;
const MAX_TITLE = 70;
const MAX_HOOK = 120;

const plainLen = (html: string) => {
  if (!html) return 0;
  if (typeof window === "undefined") return html.length;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").trim().length;
};

// Le générateur renvoie du texte brut : on le convertit en HTML éditable en RichText.
const toHtml = (txt: string) => {
  if (!txt) return "";
  if (/<[a-z][\s\S]*>/i.test(txt)) return txt;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return txt
    .split(/\n{1,}/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p>${esc(l)}</p>`)
    .join("");
};

const LENGTHS: Array<{ value: string; label: string }> = [
  { value: "very_short", label: "Très courte (~400)" },
  { value: "short", label: "Courte (~800)" },
  { value: "medium", label: "Moyenne (~1300)" },
  { value: "long", label: "Longue (~2000)" },
];

const lengthLabel = (v: string | null) => LENGTHS.find((l) => l.value === v)?.label ?? null;

const STYLES: Array<{ value: string; label: string; help: string }> = [
  { value: "default", label: "Par défaut", help: "Rédaction éditoriale standard, fluide et concrète." },
  { value: "immersive", label: "Immersif (poétique)", help: "Prose sensorielle et évocatrice, toujours ancrée dans les faits détectés." },
  { value: "factual", label: "Factuel (linéaire)", help: "Restitue les informations de la source (PDF, menu, url) telles quelles, en lignes courtes." },
];

const styleLabel = (v: string | null) => STYLES.find((s) => s.value === v)?.label ?? null;

// Les menus / cartes ET les liens externes proviennent EXCLUSIVEMENT des
// documents du backoffice (business_documents, types menu | flipbook |
// external_link) : jamais des champs de la fiche (menu_url, pdf_url,
// flipbook_url, url_1 à url_6, website, réservation…), qui sont des CTAs ou
// des fichiers legacy.



const MODES: Array<{ value: string; label: string; help: string }> = [
  {
    value: "reviews_suggestions",
    label: "Quelles sont les suggestions des clients ?",
    help: "Analyse les avis clients récupérés (onglet Avis clients) et met en avant ce que les clients conseillent.",
  },
  {
    value: "reviews_pros_cons",
    label: "Quels sont les pour et contre d'après les avis clients ?",
    help: "Synthèse honnête des points forts et des points d'attention, uniquement d'après les avis.",
  },
  {
    value: "google_search",
    label: "À partir de la recherche Google sur « Nom établissement + Ville »",
    help: "Recherche web en direct (presse, blogs, annuaires) puis rédaction à partir des extraits trouvés.",
  },
  {
    value: "platform_pages",
    label: "En suivant le détail des fiches des plateformes renseignées",
    help: "Lecture des fiches Google, TripAdvisor, Restaurant Guru… renseignées dans l'onglet Avis clients.",
  },
  {
    value: "menu_links",
    label: "À partir du menu",
    help: "Lecture des menus / cartes / PDF détectés sur la fiche. Sélectionnez les liens à exploiter.",
  },
  {
    value: "external_links",
    label: "À partir de liens externes",
    help: "Lecture des liens externes détectés sur la fiche (site web, boutique, réservation…).",
  },
];

const modeLabel = (v: string) => MODES.find((m) => m.value === v)?.label ?? v;


const AffiliateAiTextsEditor = ({ businessId }: { businessId: string }) => {
  const [texts, setTexts] = useState<AiText[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(MODES[0].value);
  const [length, setLength] = useState("short");
  const [style, setStyle] = useState("default");
  const [extra, setExtra] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [pristine, setPristine] = useState<Record<string, string>>({});
  const [biz, setBiz] = useState<Record<string, any> | null>(null);
  const [docs, setDocs] = useState<Array<{ type: string; name: string | null; url: string }>>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [includePrices, setIncludePrices] = useState(false);

  // Les menus / cartes et liens externes éditoriaux sont dans business_documents
  // (type menu | flipbook | external_link) : c'est la SEULE source.
  const docLinks = (types: string[], fallbackLabel: string) => {
    const seen = new Set<string>();
    return docs
      .filter((d) => types.includes(d.type) && String(d.url ?? "").trim())
      .map((d) => ({
        key: `doc-${d.url}`,
        label: (d.name ?? "").trim() || (d.type === "flipbook" ? "Flipbook" : fallbackLabel),
        url: String(d.url).trim(),
      }))
      .filter((d) => (seen.has(d.url) ? false : (seen.add(d.url), true)));
  };

  const dedupe = (list: Array<{ key: string; label: string; url: string }>) => {
    const seen = new Set<string>();
    return list.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
  };

  const menuLinks = useMemo(
    () => dedupe(docLinks(["menu", "flipbook"], "Menu")),
    [docs],
  );

  const externalLinks = useMemo(
    () => dedupe(docLinks(["external_link"], "Lien externe")),
    [docs],
  );

  const activeLinks = mode === "menu_links" ? menuLinks : mode === "external_links" ? externalLinks : [];

  // Analyse des prix : réservée aux menus/cartes, en mode Factuel et longueur ~2000.
  const canIncludePrices = mode === "menu_links" && style === "factual" && length === "long";

  const snapshot = (t: AiText) => JSON.stringify([t.title, t.hook, t.content, t.is_active]);
  const isDirty = (t: AiText) => pristine[t.id] !== undefined && pristine[t.id] !== snapshot(t);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, linkRes, bizRes, docRes] = await Promise.all([
      supabase
        .from("business_ai_texts")
        .select(SELECT_COLS)
        .eq("business_id", businessId)
        .order("position", { ascending: true }),
      (supabase as any)
        .from("business_embed_ai_item_links")
        .select("ai_text_ids")
        .eq("business_id", businessId),
      (supabase as any)
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .maybeSingle(),
      (supabase as any)
        .from("business_documents")
        .select("type, name, url, sort_order")
        .eq("business_id", businessId)
        .in("type", ["menu", "flipbook", "external_link"])
        .order("sort_order", { ascending: true }),
    ]);
    if (error) toast.error("Chargement impossible : " + error.message);
    const list = (data as AiText[]) ?? [];
    setTexts(list);
    setPristine(Object.fromEntries(list.map((t) => [t.id, snapshot(t)])));
    const locked = new Set<string>();
    for (const row of ((linkRes as any)?.data as any[]) ?? []) {
      for (const id of (Array.isArray(row.ai_text_ids) ? row.ai_text_ids : [])) locked.add(String(id));
    }
    setLockedIds([...locked]);
    setBiz(((bizRes as any)?.data as Record<string, any>) ?? null);
    setDocs((((docRes as any)?.data as any[]) ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [businessId]);

  // À chaque changement de source, on présélectionne tous les liens détectés.
  useEffect(() => {
    setSelectedUrls(activeLinks.map((l) => l.url));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [mode, biz, docs]);

  useEffect(() => {
    if (!canIncludePrices && includePrices) setIncludePrices(false);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [canIncludePrices]);

  const toggleUrl = (url: string) =>
    setSelectedUrls((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  const generate = async () => {
    if (texts.length >= MAX_TEXTS) {
      toast.error(`Maximum ${MAX_TEXTS} textes IA par établissement.`);
      return;
    }
    if ((mode === "menu_links" || mode === "external_links") && selectedUrls.length === 0) {
      toast.error("Sélectionnez au moins un lien.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-business-ai-text", {
        body: {
          business_id: businessId,
          mode,
          length,
          style,
          extra_instructions: extra,
          include_prices: canIncludePrices && includePrices,
          urls: mode === "menu_links" || mode === "external_links" ? selectedUrls : [],
        },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        toast.error((data as any).error);
        return;
      }
      const { title, hook, content } = data as { title: string; hook: string; content: string };
      const { data: inserted, error: insErr } = await supabase
        .from("business_ai_texts")
        .insert({
          business_id: businessId,
          title, hook,
          content: toHtml(content),
          source_mode: mode,
          position: texts.length,
          length_mode: length,
          style_mode: style,
          include_prices: canIncludePrices && includePrices,
          extra_instructions: extra.trim() || null,
        })
        .select(SELECT_COLS)
        .single();
      if (insErr) throw insErr;
      setTexts((prev) => [...prev, inserted as AiText]);
      setPristine((p) => ({ ...p, [(inserted as AiText).id]: snapshot(inserted as AiText) }));
      toast.success("Texte IA généré");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  };


  const addEmpty = async () => {
    if (texts.length >= MAX_TEXTS) {
      toast.error(`Maximum ${MAX_TEXTS} textes IA par établissement.`);
      return;
    }
    const { data, error } = await supabase
      .from("business_ai_texts")
      .insert({ business_id: businessId, source_mode: mode, position: texts.length })
      .select(SELECT_COLS)
      .single();
    if (error) return toast.error(error.message);
    setTexts((prev) => [...prev, data as AiText]);
    setPristine((p) => ({ ...p, [(data as AiText).id]: snapshot(data as AiText) }));
  };

  const patch = (id: string, field: keyof AiText, value: any) =>
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  const save = async (t: AiText) => {
    setSavingId(t.id);
    const { error } = await supabase
      .from("business_ai_texts")
      .update({ title: t.title, hook: t.hook, content: t.content, is_active: t.is_active })
      .eq("id", t.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setPristine((p) => ({ ...p, [t.id]: snapshot(t) }));
    toast.success("Enregistré");
  };

  const remove = async (id: string) => {
    if (lockedIds.includes(id)) {
      toast.error("Ce texte est lié à une suggestion/relance dans l'onglet Agent IA — retirez la liaison d'abord.");
      return;
    }
    const { error } = await supabase.from("business_ai_texts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= texts.length) return;
    const next = [...texts];
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((t, i) => ({ ...t, position: i }));
    setTexts(reordered);
    await Promise.all(
      reordered.map((t) => supabase.from("business_ai_texts").update({ position: t.position }).eq("id", t.id)),
    );
  };

  const activeMode = MODES.find((m) => m.value === mode)!;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
        <p className="text-lg md:text-xl font-semibold leading-snug text-white">
          Vous avez la possibilité d'éditer des Titres, accroches et texte de différentes tailles à partir de différentes sources pour enrichir vos publications :
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm md:text-base text-white/75">
          <li>Sites web, réseaux sociaux…</li>
          <li>Trouver des idées et les exploiter dans notre Studio Vidéo IA qui transforme automatiquement une vidéo brute en vidéo intelligente.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-white font-semibold">Générer un texte IA</h3>
          <span className="text-xs text-white/60">{texts.length}/{MAX_TEXTS} textes</span>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Source de génération</Label>
          <div className="grid gap-2">
            {MODES.filter(
              (m) =>
                (m.value !== "menu_links" || menuLinks.length > 0) &&
                (m.value !== "external_links" || externalLinks.length > 0),
            ).map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                  mode === m.value ? "border-primary bg-primary/10" : "border-white/10 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="ai-text-mode"
                  className="mt-1 accent-current"
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                />
                <span>
                  <span className="block text-sm font-medium text-white">
                    {m.label}
                    {m.value === "menu_links" && ` (${menuLinks.length})`}
                    {m.value === "external_links" && ` (${externalLinks.length})`}
                  </span>
                  <span className="block text-xs text-white/60">{m.help}</span>
                  {m.value === "menu_links" && (
                    <span className="mt-1 block text-xs text-white/45">
                      Affiches "Récupérer les prix et calculer les moyennes », visible seulement en À partir du menu + Factuel + Longue (~2000) : prix restitués tels quels, prix moyen général + moyennes par section (min–max, nb de prix), lecture de source élargie à 9 000 caractères."
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        {activeLinks.length > 0 && (
          <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-white">Liens à exploiter</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUrls(activeLinks.map((l) => l.url))}
                  className="rounded border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUrls([])}
                  className="rounded border border-white/15 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
                >
                  Aucun
                </button>
              </div>
            </div>
            <div className="grid gap-1.5">
              {activeLinks.map((l) => (
                <div key={l.key} className="flex items-start gap-2 text-xs text-white/80">
                  <label className="flex min-w-0 flex-1 items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-current"
                      checked={selectedUrls.includes(l.url)}
                      onChange={() => toggleUrl(l.url)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-white">{l.label}</span>{" "}
                      <span className="break-all text-white/50">{l.url}</span>
                    </span>
                  </label>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ouvrir dans un nouvel onglet"
                    className="mt-0.5 shrink-0 rounded border border-white/15 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}

            </div>
            <p className="text-xs text-white/50">{selectedUrls.length} lien(s) sélectionné(s) — 4 liens lus au maximum.</p>
          </div>
        )}


        <div className="space-y-2">
          <Label className="text-white">Longueur du texte</Label>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  length === l.value ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-extra" className="text-white">Consigne complémentaire (optionnel)</Label>
          <Input
            id="ai-extra"
            value={extra}
            maxLength={500}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Ex. insister sur la cuisine marocaine et la terrasse"
            className="h-11 text-white placeholder:text-white/50"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-white">Style du texte rendu</Label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  style === s.value ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">{STYLES.find((s) => s.value === style)!.help}</p>
        </div>

        {canIncludePrices && (
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gold/30 bg-gold/5 p-3">
            <input
              type="checkbox"
              className="mt-1 accent-current"
              checked={includePrices}
              onChange={(e) => setIncludePrices(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-white">Récupérer les prix et calculer les moyennes</span>
              <span className="block text-xs text-white/60">
                Uniquement disponible pour les menus / cartes, en style Factuel et longueur Longue (~2000).
                Les prix lus dans la source sont restitués, avec un prix moyen général et des prix moyens par section.
              </span>
            </span>
          </label>
        )}


        <div className="flex flex-wrap gap-3">
          <Button onClick={generate} disabled={generating || texts.length >= MAX_TEXTS}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer avec l'IA
          </Button>
          <Button variant="outline" onClick={addEmpty} disabled={texts.length >= MAX_TEXTS}>
            <Plus className="h-4 w-4" /> Ajouter un texte vide
          </Button>
        </div>
        <p className="text-xs text-white/50">{activeMode.help} Textes limités à {MAX_CONTENT} caractères.{canIncludePrices && includePrices ? " Les prix de la source seront restitués et moyennés." : " Aucun prix n'est mentionné."}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : texts.length === 0 ? (
        <p className="text-sm text-white/60">Aucun texte IA pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {texts.map((t, i) => {
            const over = plainLen(t.content) > MAX_CONTENT;
            const locked = lockedIds.includes(t.id);
            return (
              <div key={t.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">Texte {i + 1}</span>
                    <span className="text-xs text-white/50">{modeLabel(t.source_mode)}</span>
                    {lengthLabel(t.length_mode) && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">{lengthLabel(t.length_mode)}</span>
                    )}
                    {styleLabel(t.style_mode) && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70">Ton : {styleLabel(t.style_mode)}</span>
                    )}
                    {t.include_prices && (
                      <span className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold">Prix analysés</span>
                    )}
                    {locked && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                        <Lock className="h-3 w-3" /> Utilisé par l'Agent IA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Switch
                        checked={t.is_active}
                        disabled={locked}
                        onCheckedChange={(v) => patch(t.id, "is_active", v)}
                      />
                      <span className="text-xs text-white/60">{t.is_active ? "Actif" : "Masqué"}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === texts.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)} disabled={locked}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {t.extra_instructions && (
                  <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                    <span className="font-medium text-white/80">Consigne complémentaire :</span> {t.extra_instructions}
                  </p>
                )}


                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Titre</Label>
                    <span className="text-xs text-white/60">{t.title.length}/{MAX_TITLE}</span>
                  </div>
                  <Input
                    value={t.title}
                    maxLength={MAX_TITLE}
                    onChange={(e) => patch(t.id, "title", e.target.value.slice(0, MAX_TITLE))}
                    className="h-11 text-white placeholder:text-white/50"
                    placeholder="Titre du texte"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Accroche</Label>
                    <span className="text-xs text-white/60">{t.hook.length}/{MAX_HOOK}</span>
                  </div>
                  <Input
                    value={t.hook}
                    maxLength={MAX_HOOK}
                    onChange={(e) => patch(t.id, "hook", e.target.value.slice(0, MAX_HOOK))}
                    className="!text-lg font-semibold h-12 text-white placeholder:text-white/50"
                    placeholder="Accroche courte"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Texte</Label>
                    <span className={`text-xs ${over ? "text-destructive font-medium" : "text-white/60"}`}>
                      {plainLen(t.content)}/{MAX_CONTENT}
                    </span>
                  </div>
                  <RichTextEditor
                    content={t.content || ""}
                    onChange={(html) => patch(t.id, "content", html)}
                    bgClass="border border-white/10 bg-zinc-900 text-white"
                    maxHeight="480px"
                    simple
                  />
                </div>


                <div className="flex justify-end">
                  <Button onClick={() => save(t)} disabled={savingId === t.id || !isDirty(t)}>
                    {savingId === t.id && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AffiliateAiTextsEditor;
