import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Rocket, Save } from "lucide-react";
import { toast } from "sonner";
import VideoEncodeOptionsBlock from "@/components/staff/VideoEncodeOptionsBlock";
import VideoJobMeta, { type VideoJobMetaRow } from "@/components/staff/VideoJobMeta";
import { ENCODE_PRESETS, normalizeEncode, type EncodeOptions } from "@/lib/videoEncode";
import {
  MontageEffectsBlock,
  SimpleEffectsBlock,
  hasAnyMontageEffect,
  hasAnySimpleEffect,
  type MontageEffects,
} from "@/components/staff/video-effects";

/**
 * Onglets « Effets » et « Rendus » des scénarios automatiques.
 *
 * Le rendu était auparavant délégué à Studio Vidéo IA (lien externe) : il est
 * désormais lancé ici, avec les mêmes réglages d'effets et de compression que
 * les montages manuels. La configuration vit dans `video_scenario_configs`
 * (colonnes `effects`, `encode`, `render_prompt`, `render_duration_sec`,
 * `render_tone`) et est transmise au worker via `template_props`.
 */

export type ScenarioRenderMode = "business" | "corporate";

const TEMPLATE_BY_MODE: Record<ScenarioRenderMode, string> = {
  business: "business-showcase",
  corporate: "corporate-vertical",
};

const TONES = ["immersif", "dynamique", "premium", "chaleureux", "corporate"];

type ScenarioRow = {
  business_id: string | null;
  width: number | null;
  height: number | null;
  effects: MontageEffects | null;
  encode: EncodeOptions | null;
  render_prompt: string | null;
  render_duration_sec: number | null;
  render_tone: string | null;
};

const VideoScenarioRenderPanel = ({
  mode,
  activeTab,
  jobs,
  jobBusinessNames,
  onReloadJobs,
}: {
  mode: ScenarioRenderMode;
  activeTab: string;
  jobs: VideoJobMetaRow[] & Array<{ status?: string; error_message?: string | null; business_id?: string | null }>;
  jobBusinessNames: Record<string, string>;
  onReloadJobs: () => void;
}) => {
  const [row, setRow] = useState<ScenarioRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("video_scenario_configs")
      .select("business_id, width, height, effects, encode, render_prompt, render_duration_sec, render_tone")
      .eq("mode", mode)
      .maybeSingle();
    const raw = (data ?? null) as any;
    setRow({
      business_id: raw?.business_id ?? null,
      width: Number(raw?.width) || 1920,
      height: Number(raw?.height) || 1080,
      effects: (raw?.effects ?? null) as MontageEffects | null,
      encode: (raw?.encode ?? null) as EncodeOptions | null,
      render_prompt: raw?.render_prompt ?? null,
      render_duration_sec: Number(raw?.render_duration_sec) || 30,
      render_tone: raw?.render_tone ?? "immersif",
    });
    setDirty(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (values: Partial<ScenarioRow>) => {
    setRow((prev) => (prev ? { ...prev, ...values } : prev));
    setDirty(true);
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("video_scenario_configs").upsert(
      {
        mode,
        effects: row.effects as any,
        encode: normalizeEncode(row.encode) as any,
        render_prompt: row.render_prompt,
        render_duration_sec: Math.max(5, Math.min(180, Number(row.render_duration_sec) || 30)),
        render_tone: row.render_tone || "immersif",
      } as any,
      { onConflict: "mode" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Enregistrement échoué : ${error.message}`);
      return;
    }
    toast.success("Réglages du scénario enregistrés");
    setDirty(false);
  };

  /**
   * Lancement du rendu depuis cette interface : le déroulé (étapes, textes,
   * médias) vient déjà de `video_scenario_steps` / `video_scenario_configs`,
   * seul le prompt de cadrage et la durée sont saisis ici.
   */
  const render = async (variants?: EncodeOptions[]) => {
    if (!row) return;
    if (dirty) {
      toast.error("Enregistre les réglages avant de lancer le rendu");
      return;
    }
    const prompt = (row.render_prompt ?? "").trim();
    if (!prompt) {
      toast.error("Renseigne le prompt de rendu (onglet Rendus)");
      return;
    }
    setRendering(true);
    const encodeVariants = variants && variants.length > 0 ? variants : [normalizeEncode(row.encode)];
    const effects =
      hasAnyMontageEffect(row.effects) || hasAnySimpleEffect(row.effects) ? row.effects : undefined;
    let failed = 0;
    for (const enc of encodeVariants) {
      const { error } = await supabase.functions.invoke("video-scenario-generate", {
        body: {
          prompt,
          business_id: row.business_id,
          duration_sec: Math.max(5, Math.min(180, Number(row.render_duration_sec) || 30)),
          tone: row.render_tone || "immersif",
          options: {
            lang: "fr",
            canvas_width: row.width ?? 1920,
            canvas_height: row.height ?? 1080,
            encode: enc,
            ...(effects ? { effects } : {}),
          },
        },
      });
      if (error) failed += 1;
    }
    if (failed === 0) {
      await supabase.functions.invoke("trigger-render-workflow", { body: {} });
    }
    setRendering(false);
    if (failed > 0) toast.error(`${failed} rendu(s) non lancé(s).`);
    else
      toast.success(
        encodeVariants.length > 1
          ? `${encodeVariants.length} jobs créés (un par niveau de compression).`
          : "Job créé : rendu du scénario automatique lancé.",
      );
    onReloadJobs();
  };

  const modeJobs = jobs.filter((j) => j.template_id === TEMPLATE_BY_MODE[mode]);

  if (!row) return null;

  return (
    <>
      {/* ===== Effets ===== */}
      <div className={activeTab === "effets" ? "space-y-4" : "hidden"}>
        <MontageEffectsBlock value={row.effects ?? null} onChange={(v) => patch({ effects: v })} />
        <SimpleEffectsBlock value={row.effects ?? null} onChange={(v) => patch({ effects: v })} />
        <VideoEncodeOptionsBlock
          value={normalizeEncode(row.encode)}
          onChange={(v) => patch({ encode: v })}
          showScale={false}
          onGenerateAll={() =>
            render(
              ENCODE_PRESETS.map((p) => ({ ...normalizeEncode(row.encode), preset: p.id, crf: p.crf })),
            )
          }
          generatingAll={rendering}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {dirty ? "Modifications non enregistrées" : "À jour"}
          </span>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            <Save className="h-4 w-4 mr-1" /> Enregistrer
          </Button>
        </div>
      </div>

      {/* ===== Rendus ===== */}
      <div className={activeTab === "rendus" ? "space-y-4" : "hidden"}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-black text-base flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Lancer le rendu du scénario automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Le déroulé (étapes, textes, médias) et les effets configurés ici sont appliqués tels quels.
              Le prompt sert uniquement au cadrage éditorial du moteur{" "}
              <code>{TEMPLATE_BY_MODE[mode]}</code>.
            </p>
            <Textarea
              value={row.render_prompt ?? ""}
              onChange={(e) => patch({ render_prompt: e.target.value.slice(0, 8000) })}
              placeholder="Ex. Vidéo corporate One World Morocco : présenter la plateforme, ton premium, rythme soutenu."
              className="text-xs min-h-28"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs text-muted-foreground grid gap-1">
                Durée cible (5–180 s)
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={row.render_duration_sec ?? 30}
                  onChange={(e) => patch({ render_duration_sec: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </label>
              <label className="text-xs text-muted-foreground grid gap-1">
                Ton
                <select
                  value={row.render_tone ?? "immersif"}
                  onChange={(e) => patch({ render_tone: e.target.value })}
                  className="h-9 rounded-md border bg-background px-2 text-xs"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs text-muted-foreground self-end">
                Canvas {row.width ?? 1920}×{row.height ?? 1080}
                {row.business_id ? "" : " · aucun établissement lié"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} variant="outline" disabled={!dirty || saving}>
                <Save className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
              <Button size="sm" variant="secondary" onClick={() => render()} disabled={rendering || saving || dirty}>
                <Rocket className="h-4 w-4 mr-1" /> {rendering ? "Lancement…" : "Rendre le scénario"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-black text-base">Rendus du scénario automatique</CardTitle>
            <Button size="sm" variant="outline" onClick={onReloadJobs}>
              <RotateCcw className="h-4 w-4 mr-1" /> Rafraîchir
            </Button>
          </CardHeader>
          <CardContent>
            {modeJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rendu pour ce scénario.</p>
            ) : (
              <div className="divide-y">
                {modeJobs.map((j) => (
                  <div key={j.id} className="py-3 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <Badge
                        variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {j.status}
                      </Badge>
                      <span className="text-black font-medium">{j.title || j.id.slice(0, 8)}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">{j.template_id}</span>
                      {j.output_url && (
                        <a
                          href={j.output_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] underline text-primary ml-auto"
                        >
                          Ouvrir la vidéo
                        </a>
                      )}
                      {j.error_message && (
                        <span className="text-[11px] text-destructive ml-auto max-w-md truncate">
                          {j.error_message}
                        </span>
                      )}
                    </div>
                    <VideoJobMeta
                      job={j}
                      businessName={j.business_id ? jobBusinessNames[j.business_id] : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default VideoScenarioRenderPanel;
