import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";

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
}

const SELECT_COLS = "id,title,hook,content,source_mode,position,is_active,extra_instructions,length_mode";

const MAX_TEXTS = 5;
const MAX_CONTENT = 2000;
const MAX_TITLE = 70;
const MAX_HOOK = 120;

const LENGTHS: Array<{ value: string; label: string }> = [
  { value: "very_short", label: "Très courte (~400)" },
  { value: "short", label: "Courte (~800)" },
  { value: "medium", label: "Moyenne (~1300)" },
  { value: "long", label: "Longue (~2000)" },
];

const lengthLabel = (v: string | null) => LENGTHS.find((l) => l.value === v)?.label ?? null;

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
];

const modeLabel = (v: string) => MODES.find((m) => m.value === v)?.label ?? v;

const AffiliateAiTextsEditor = ({ businessId }: { businessId: string }) => {
  const [texts, setTexts] = useState<AiText[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(MODES[0].value);
  const [extra, setExtra] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_ai_texts")
      .select("id,title,hook,content,source_mode,position,is_active")
      .eq("business_id", businessId)
      .order("position", { ascending: true });
    if (error) toast.error("Chargement impossible : " + error.message);
    setTexts((data as AiText[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [businessId]);

  const generate = async () => {
    if (texts.length >= MAX_TEXTS) {
      toast.error(`Maximum ${MAX_TEXTS} textes IA par établissement.`);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-business-ai-text", {
        body: { business_id: businessId, mode, extra_instructions: extra },
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
          title, hook, content,
          source_mode: mode,
          position: texts.length,
        })
        .select("id,title,hook,content,source_mode,position,is_active")
        .single();
      if (insErr) throw insErr;
      setTexts((prev) => [...prev, inserted as AiText]);
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
      .select("id,title,hook,content,source_mode,position,is_active")
      .single();
    if (error) return toast.error(error.message);
    setTexts((prev) => [...prev, data as AiText]);
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
    error ? toast.error(error.message) : toast.success("Enregistré");
  };

  const remove = async (id: string) => {
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
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-white font-semibold">Générer un texte IA</h3>
          <span className="text-xs text-white/60">{texts.length}/{MAX_TEXTS} textes</span>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Source de génération</Label>
          <div className="grid gap-2">
            {MODES.map((m) => (
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
                  <span className="block text-sm font-medium text-white">{m.label}</span>
                  <span className="block text-xs text-white/60">{m.help}</span>
                </span>
              </label>
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

        <div className="flex flex-wrap gap-3">
          <Button onClick={generate} disabled={generating || texts.length >= MAX_TEXTS}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer avec l'IA
          </Button>
          <Button variant="outline" onClick={addEmpty} disabled={texts.length >= MAX_TEXTS}>
            <Plus className="h-4 w-4" /> Ajouter un texte vide
          </Button>
        </div>
        <p className="text-xs text-white/50">{activeMode.help} Textes limités à {MAX_CONTENT} caractères. Aucun prix n'est jamais mentionné.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/60"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : texts.length === 0 ? (
        <p className="text-sm text-white/60">Aucun texte IA pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {texts.map((t, i) => {
            const over = t.content.length > MAX_CONTENT;
            return (
              <div key={t.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">Texte {i + 1}</span>
                    <span className="text-xs text-white/50">{modeLabel(t.source_mode)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Switch checked={t.is_active} onCheckedChange={(v) => patch(t.id, "is_active", v)} />
                      <span className="text-xs text-white/60">{t.is_active ? "Actif" : "Masqué"}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === texts.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

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
                      {t.content.length}/{MAX_CONTENT}
                    </span>
                  </div>
                  <Textarea
                    value={t.content}
                    maxLength={MAX_CONTENT}
                    onChange={(e) => patch(t.id, "content", e.target.value.slice(0, MAX_CONTENT))}
                    rows={10}
                    className="text-white placeholder:text-white/50 bg-zinc-900 border-white/10"
                    placeholder="Texte généré ou rédigé à la main"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => save(t)} disabled={savingId === t.id}>
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
