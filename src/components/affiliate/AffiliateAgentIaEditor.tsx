import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Bot, MessageSquareReply, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  businessId: string;
  businessCity?: string | null;
}

type Row = { id: string; label: string };

const normCity = (s: string | null | undefined) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const AffiliateAgentIaEditor = ({ businessId, businessCity }: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const [followups, setFollowups] = useState<Row[]>([]);
  const [selSugg, setSelSugg] = useState<string[]>([]);
  const [selFu, setSelFu] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const [sRes, fRes, pRes] = await Promise.all([
        supabase
          .from("embed_ai_suggestions")
          .select("id,label_fr,city")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("embed_ai_followups")
          .select("id,label_fr")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        (supabase as any)
          .from("business_embed_ai_prefs")
          .select("enabled_suggestion_ids,enabled_followup_ids")
          .eq("business_id", businessId)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      const bizCity = normCity(businessCity);
      const sList: Row[] = ((sRes.data as any[]) ?? [])
        .filter((r) => {
          const c = normCity(r.city);
          return !c || !bizCity || c === bizCity;
        })
        .map((r) => ({ id: r.id as string, label: (r.label_fr || "").trim() }))
        .filter((r) => r.label);
      const fList: Row[] = ((fRes.data as any[]) ?? [])
        .map((r) => ({ id: r.id as string, label: (r.label_fr || "").trim() }))
        .filter((r) => r.label);

      setSuggestions(sList);
      setFollowups(fList);

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

  const handleSave = async () => {
    if (selSugg.length === 0) {
      toast.error("Sélectionnez au moins une suggestion.");
      return;
    }
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
    toast.success("Agent IA mis à jour — le widget applique la sélection immédiatement.");
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
            Tout décocher dans les relances revient à masquer les relances.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

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
            <label
              key={s.id}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <Checkbox
                checked={selSugg.includes(s.id)}
                onCheckedChange={() => toggle(selSugg, setSelSugg, s.id)}
                className="mt-0.5"
              />
              <span className="text-sm text-white/80">{s.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

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
            <label
              key={f.id}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <Checkbox
                checked={selFu.includes(f.id)}
                onCheckedChange={() => toggle(selFu, setSelFu, f.id)}
                className="mt-0.5"
              />
              <span className="text-sm text-white/80">{f.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateAgentIaEditor;
