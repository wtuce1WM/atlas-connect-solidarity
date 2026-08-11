import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Bot, MessageSquareReply, Sparkles, X, Newspaper, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  businessId: string;
  businessCity?: string | null;
  /** Tous les établissements de l'affilié (pour appliquer une entrée à plusieurs fiches). */
  siblings?: Array<{ id: string; name: string }>;
}

type Row = { id: string; label: string };
type BlogRow = { id: string; title: string; isOwner: boolean };
type LinkValue = { blog: string[]; ai: string[] };
type Kind = "suggestion" | "followup";

const normCity = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const keyOf = (kind: Kind, id: string) => `${kind}:${id}`;

type LinkEditorProps = {
  kind: Kind;
  itemId: string;
  links: Record<string, LinkValue>;
  posts: BlogRow[];
  aiTexts: Row[];
  search: string;
  onSearch: (v: string) => void;
  saveLink: (kind: Kind, itemId: string, next: LinkValue) => void;
};

/**
 * Hissé au niveau module : défini à l'intérieur du parent, il était recréé à
 * chaque frappe et l'Input de recherche perdait le focus (auto-complete cassée).
 */
const LinkEditor = ({ kind, itemId, links, posts, aiTexts, search, onSearch, saveLink }: LinkEditorProps) => {
    const current = links[keyOf(kind, itemId)] ?? { blog: [], ai: [] };
    const add = (field: "blog" | "ai", id: string) => {
      if (current[field].includes(id)) return;
      saveLink(kind, itemId, { ...current, [field]: [...current[field], id] });
    };
    const remove = (field: "blog" | "ai", id: string) => {
      saveLink(kind, itemId, { ...current, [field]: current[field].filter((x) => x !== id) });
  };

    return (
      <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/60 flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 text-primary" /> Articles de blog liés
          </p>
          <div className="flex flex-wrap gap-1.5">
            {current.blog.map((id) => {
              const p = posts.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                  {p?.title ?? id.slice(0, 8)}
                  <button type="button" onClick={() => remove("blog", id)} aria-label="Retirer l'article">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher dans le titre des articles…"
            className="h-9 text-xs text-white placeholder:text-white/40"
          />
          <Select value="" onValueChange={(v) => add("blog", v)}>
            <SelectTrigger className="h-9 text-xs text-white">
              <SelectValue placeholder="Ajouter un article…" />
            </SelectTrigger>
            <SelectContent className="z-[90] max-h-72">
              {(() => {
                const q = normCity(search);
                const list = posts.filter(
                  (p) => !current.blog.includes(p.id) && (!q || normCity(p.title).includes(q)),
                );
                if (!list.length) {
                  return <div className="px-2 py-3 text-xs text-muted-foreground">Aucun article trouvé</div>;
                }
                return list.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.isOwner ? "★ " : ""}{p.title}
                  </SelectItem>
                ));
              })()}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/60 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" /> Textes IA liés
          </p>
          <div className="flex flex-wrap gap-1.5">
            {current.ai.map((id) => {
              const t = aiTexts.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                  {t?.label ?? id.slice(0, 8)}
                  <button type="button" onClick={() => remove("ai", id)} aria-label="Retirer le texte IA">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          {aiTexts.length === 0 ? (
            <p className="text-xs text-white/40">Aucun texte IA — créez-en dans l'onglet TXT IA.</p>
          ) : (
            <Select value="" onValueChange={(v) => add("ai", v)}>
              <SelectTrigger className="h-9 text-xs text-white">
                <SelectValue placeholder="Ajouter un texte IA…" />
              </SelectTrigger>
              <SelectContent className="z-[90] max-h-72">
                {aiTexts
                  .filter((t) => !current.ai.includes(t.id))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    );
  };



const AffiliateAgentIaEditor = ({ businessId, businessCity, siblings = [] }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [blogSearch, setBlogSearch] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const [followups, setFollowups] = useState<Row[]>([]);
  const [selSugg, setSelSugg] = useState<string[]>([]);
  const [selFu, setSelFu] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [aiTexts, setAiTexts] = useState<Row[]>([]);
  const [links, setLinks] = useState<Record<string, LinkValue>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const [sRes, fRes, pRes, blogRes, txtRes, lnkRes, bizRes] = await Promise.all([
        supabase
          .from("ai_suggestions")
          .select("id,label_fr,city,main_categories")
          .eq("surface", "embed")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("ai_followups")
          .select("id,label_fr")
          .eq("surface", "embed")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("business_embed_ai_prefs")
          .select("enabled_suggestion_ids,enabled_followup_ids")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("blog_posts")
          .select("id,title_fr,anchor_business_id")
          .eq("is_published", true)
          .order("published_at", { ascending: false }),
        supabase
          .from("business_ai_texts")
          .select("id,title,position")
          .eq("business_id", businessId)
          .order("position", { ascending: true }),
        (supabase as any)
          .from("business_embed_ai_item_links")
          .select("item_kind,item_id,blog_post_ids,ai_text_ids")
          .eq("business_id", businessId),
        (supabase as any)
          .from("businesses")
          .select("main_category")
          .eq("id", businessId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const bizCity = normCity(businessCity);
      const bizCat = normCity((bizRes as any)?.data?.main_category as string | null);
      const sList: Row[] = ((sRes.data as any[]) ?? [])
        .filter((r) => {
          const c = normCity(r.city);
          if (c && bizCity && c !== bizCity) return false;
          const cats: string[] = Array.isArray(r.main_categories) ? r.main_categories : [];
          if (cats.length > 0 && (!bizCat || !cats.some((x) => normCity(x) === bizCat))) return false;
          return true;
        })
        .map((r) => ({ id: r.id as string, label: (r.label_fr || "").trim() }))
        .filter((r) => r.label);
      const fList: Row[] = ((fRes.data as any[]) ?? [])
        .map((r) => ({ id: r.id as string, label: (r.label_fr || "").trim() }))
        .filter((r) => r.label);

      setSuggestions(sList);
      setFollowups(fList);

      const blogList: BlogRow[] = ((blogRes.data as any[]) ?? [])
        .map((p) => ({
          id: p.id as string,
          title: (p.title_fr || "").trim(),
          isOwner: p.anchor_business_id === businessId,
        }))
        .filter((p) => p.title)
        .sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
      setPosts(blogList);

      setAiTexts(
        ((txtRes.data as any[]) ?? []).map((t, i) => ({
          id: t.id as string,
          label: (t.title || "").trim() || `Texte ${i + 1}`,
        })),
      );

      const map: Record<string, LinkValue> = {};
      for (const l of ((lnkRes as any)?.data as any[]) ?? []) {
        map[keyOf(l.item_kind as Kind, l.item_id as string)] = {
          blog: Array.isArray(l.blog_post_ids) ? l.blog_post_ids : [],
          ai: Array.isArray(l.ai_text_ids) ? l.ai_text_ids : [],
        };
      }
      setLinks(map);

      const prefs = (pRes as any)?.data;
      // Aucun enregistrement = tout est actif par défaut.
      setSelSugg(
        prefs && Array.isArray(prefs.enabled_suggestion_ids) && prefs.enabled_suggestion_ids.length > 0
          ? prefs.enabled_suggestion_ids
          : sList.map((r) => r.id),
      );
      // Pour les relances, une liste vide enregistrée signifie "aucune relance".
      setSelFu(
        prefs && Array.isArray(prefs.enabled_followup_ids)
          ? prefs.enabled_followup_ids
          : fList.map((r) => r.id),
      );
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId, businessCity]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  // Auto-save (debounce 1.2s) — pas de CTA Enregistrer, comme dans l'onglet Images.
  const dirtyRef = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!dirtyRef.current) { dirtyRef.current = true; return; }
    if (selSugg.length === 0) return;

    const t = setTimeout(async () => {
      setIsSaving(true);
      const { error } = await (supabase as any)
        .from("business_embed_ai_prefs")
        .upsert(
          {
            business_id: businessId,
            enabled_suggestion_ids: selSugg,
            enabled_followup_ids: selFu,
          },
          { onConflict: "business_id" },
        );
      setIsSaving(false);
      if (error) { toast.error(error.message); return; }
      setSavedAt(Date.now());
    }, 1200);
    return () => clearTimeout(t);
  }, [selSugg, selFu, businessId, isLoading]);

  const saveLink = async (kind: Kind, itemId: string, next: LinkValue) => {
    setLinks((prev) => ({ ...prev, [keyOf(kind, itemId)]: next }));
    setIsSaving(true);
    const { error } = await (supabase as any)
      .from("business_embed_ai_item_links")
      .upsert(
        {
          business_id: businessId,
          item_kind: kind,
          item_id: itemId,
          blog_post_ids: next.blog,
          ai_text_ids: next.ai,
        },
        { onConflict: "business_id,item_kind,item_id" },
      );
    setIsSaving(false);
    if (error) { toast.error(error.message); return; }
    setSavedAt(Date.now());
  };

  const counters = useMemo(
    () => ({ s: `${selSugg.length}/${suggestions.length}`, f: `${selFu.length}/${followups.length}` }),
    [selSugg, selFu, suggestions, followups],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Agent IA
          </h3>
          <p className="text-sm text-white/60 max-w-2xl">
            Choisissez les suggestions de départ et les relances proposées par votre Widget Assistant IA.
            Pour chaque entrée activée, vous pouvez lier des articles de blog (★ = le vôtre) et des textes IA
            qui serviront de source à la réponse. Tout décocher dans les relances revient à masquer les relances.
            Enregistrement automatique.
          </p>
          {selSugg.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Sélectionnez au moins une suggestion pour enregistrer.
            </p>
          )}
        </div>
        <span className="text-xs text-white/50 inline-flex items-center gap-1.5 shrink-0">
          {isSaving ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>
          ) : savedAt ? (
            <><Check className="h-3.5 w-3.5 text-emerald-400" /> Enregistré</>
          ) : null}
        </span>
      </div>


      <Tabs defaultValue="suggestions">
        <TabsList className="bg-white/5">
          <TabsTrigger value="suggestions" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Suggestions
            <span className="text-xs font-normal opacity-60">{counters.s}</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5">
            <MessageSquareReply className="h-3.5 w-3.5" /> Relances
            <span className="text-xs font-normal opacity-60">{counters.f}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Suggestions Embed IA
                <span className="text-xs font-normal text-white/50">{counters.s}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {suggestions.length === 0 && (
                <p className="text-sm text-white/50">Aucune suggestion disponible.</p>
              )}
              {suggestions.map((s) => (
                <div key={s.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={selSugg.includes(s.id)}
                      onCheckedChange={() => toggle(selSugg, setSelSugg, s.id)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-white/80">{s.label}</span>
                  </label>
                  {selSugg.includes(s.id) && <LinkEditor kind="suggestion" itemId={s.id} links={links} posts={posts} aiTexts={aiTexts} saveLink={saveLink} search={blogSearch[keyOf("suggestion", s.id)] ?? ""} onSearch={(v) => setBlogSearch((p) => ({ ...p, [keyOf("suggestion", s.id)]: v }))} />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <MessageSquareReply className="h-4 w-4 text-primary" />
                Relances après la réponse IA
                <span className="text-xs font-normal text-white/50">{counters.f}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {followups.length === 0 && (
                <p className="text-sm text-white/50">Aucune relance disponible.</p>
              )}
              {followups.map((f) => (
                <div key={f.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={selFu.includes(f.id)}
                      onCheckedChange={() => toggle(selFu, setSelFu, f.id)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-white/80">{f.label}</span>
                  </label>
                  {selFu.includes(f.id) && <LinkEditor kind="followup" itemId={f.id} links={links} posts={posts} aiTexts={aiTexts} saveLink={saveLink} search={blogSearch[keyOf("followup", f.id)] ?? ""} onSearch={(v) => setBlogSearch((p) => ({ ...p, [keyOf("followup", f.id)]: v }))} />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AffiliateAgentIaEditor;
