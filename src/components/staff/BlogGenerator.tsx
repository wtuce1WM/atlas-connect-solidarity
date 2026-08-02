import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Search, X, ExternalLink, ListChecks } from "lucide-react";

const DEFAULT_PROMPT = `Ecris un article de blog « Les 20 meilleures tables de Marrakech » : Récupères les établissements avec les meilleures notes / 20 dont la sous-catégorie par défaut est « Restaurant » et qui comptabilisent + 500 avis clients sur Google, Restaurant Guru et TripAdvisor. Fais un texte immersif pour chaque établissement avec +1000 digits en insistant sur le type de cuisine. Sois attentif à la cave à vin d'exception éventuelle.`;

interface BizOption {
  id: string;
  name: string;
  city: string | null;
  slug: string;
}

interface Candidate {
  id: string;
  name: string;
  city: string | null;
  rating: number | null;
  reviews: number | null;
}

const BlogGenerator = () => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [template, setTemplate] = useState<"article_template" | "custom">("article_template");
  const [anchorKind, setAnchorKind] = useState<"owner" | "generic">("generic");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<BizOption[]>([]);
  const [selected, setSelected] = useState<BizOption | null>(null);
  const [openList, setOpenList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ id: string; slug: string; title_fr: string } | null>(null);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    if (debounce.current) window.clearTimeout(debounce.current);
    if (search.trim().length < 2) {
      setOptions([]);
      return;
    }
    debounce.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, slug")
        .ilike("name", `%${search.trim()}%`)
        .eq("is_active", true)
        .order("name")
        .limit(12);
      setOptions((data as BizOption[]) ?? []);
      setOpenList(true);
    }, 250);
  }, [search]);

  const call = async (dryRun: boolean) => {
    if (!prompt.trim()) {
      toast.error("Le prompt est vide");
      return;
    }
    dryRun ? setPreviewing(true) : setLoading(true);
    if (!dryRun) setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: {
          prompt,
          business_id: selected?.id ?? null,
          anchor_kind: selected ? anchorKind : "generic",
          template,
          dry_run: dryRun,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setCriteria((data as { criteria?: Record<string, unknown> }).criteria ?? null);
      if (dryRun) {
        setCandidates((data as { candidates: Candidate[] }).candidates ?? []);
        toast.success(`${(data as { candidates: Candidate[] }).candidates?.length ?? 0} établissements sélectionnés`);
      } else {
        setResult((data as { post: { id: string; slug: string; title_fr: string } }).post);
        toast.success("Article généré en brouillon");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setPreviewing(false);
      setLoading(false);
    }
  };

  const criteriaChips = useMemo(() => {
    if (!criteria) return [];
    const map: Record<string, string> = {
      subcategory: "Sous-catégorie",
      city: "Ville",
      min_total_reviews: "Avis min.",
      min_rating: "Note min. /20",
      count: "Nombre",
      min_chars: "Caractères min.",
    };
    return Object.entries(map)
      .filter(([k]) => criteria[k] !== null && criteria[k] !== undefined && criteria[k] !== "")
      .map(([k, label]) => `${label} : ${String(criteria[k])}`);
  }, [criteria]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Générateur d'article</h2>
        <p className="text-sm text-muted-foreground">
          Décrivez la consigne éditoriale. Les établissements sont sélectionnés en base selon vos critères,
          puis rédigés par l'IA. L'article est créé en brouillon (non publié).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consigne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="gen-prompt">Prompt (modifiable)</Label>
            <Textarea
              id="gen-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={7}
              className="text-sm leading-relaxed"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 relative">
              <Label htmlFor="gen-biz">Établissement rattaché (optionnel)</Label>
              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{selected.name}</span>
                    {selected.city && <span className="text-muted-foreground"> — {selected.city}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="gen-biz"
                      value={search}
                      placeholder="Rechercher un établissement…"
                      className="pl-9"
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => setOpenList(true)}
                    />
                  </div>
                  {openList && options.length > 0 && (
                    <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg">
                      {options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => {
                            setSelected(o);
                            setOpenList(false);
                            setSearch("");
                            setAnchorKind("owner");
                          }}
                        >
                          <span className="font-medium">{o.name}</span>
                          {o.city && <span className="text-muted-foreground"> — {o.city}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gen-template">Template</Label>
              <select
                id="gen-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value as "article_template" | "custom")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="article_template">Article structuré (classement / entrées)</option>
                <option value="custom">Article personnalisé (HTML libre)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type d'article</Label>
            <div className="flex flex-wrap gap-2">
              {(["owner", "generic"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={anchorKind === k ? "default" : "outline"}
                  disabled={!selected}
                  onClick={() => setAnchorKind(k)}
                >
                  {k === "owner" ? "Propriétaire" : "Générique"}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selected
                ? anchorKind === "owner"
                  ? "L'article sera rattaché à l'établissement comme article propriétaire."
                  : "L'article sera rattaché à l'établissement comme article générique (assistant IA embed)."
                : "Sans établissement sélectionné, l'article est générique et non rattaché."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="outline" onClick={() => call(true)} disabled={previewing || loading}>
              {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2" />}
              Prévisualiser la sélection
            </Button>
            <Button onClick={() => call(false)} disabled={loading || previewing}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Générer l'article
            </Button>
          </div>
        </CardContent>
      </Card>

      {criteriaChips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Critères détectés</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {criteriaChips.map((c) => (
              <Badge key={c} variant="secondary" className="text-xs">
                {c}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {candidates && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sélection ({candidates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {candidates.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6 tabular-nums">{i + 1}.</span>
                    <span className="font-medium">{c.name}</span>
                    {c.city && <span className="text-muted-foreground">{c.city}</span>}
                  </span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {c.rating ?? "—"}/20 · {c.reviews ?? 0} avis
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Brouillon créé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <strong>{result.title_fr}</strong>
              <span className="text-muted-foreground"> — /blog/{result.slug}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Non publié. Ouvrez l'onglet Articles pour relire, traduire (EN/AR), ajouter le hero et publier.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href={`/blog/${result.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Aperçu
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlogGenerator;
