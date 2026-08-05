import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowDown, ArrowUp, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type VideoScenarioMode = "business" | "corporate";

export type VideoScenarioStep = {
  id: string;
  mode: VideoScenarioMode;
  scene_key: string;
  label: string | null;
  position: number;
  duration_sec: number;
  enabled: boolean;
};

const MODES: Array<{ value: VideoScenarioMode; label: string }> = [
  { value: "business", label: "Établissement" },
  { value: "corporate", label: "Corporate" },
];

const VideoScenarioConfigPanel = () => {
  const [mode, setMode] = useState<VideoScenarioMode>("business");
  const [steps, setSteps] = useState<VideoScenarioStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_scenario_steps")
      .select("id, mode, scene_key, label, position, duration_sec, enabled")
      .eq("mode", mode)
      .order("position", { ascending: true });
    if (error) toast.error("Chargement impossible");
    setSteps(((data ?? []) as VideoScenarioStep[]).slice());
    setDirty(false);
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= steps.length) return;
    const next = steps.slice();
    [next[index], next[j]] = [next[j], next[index]];
    setSteps(next);
    setDirty(true);
  };

  const patch = (id: string, values: Partial<VideoScenarioStep>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...values } : s)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const rows = steps.map((s, i) => ({
      id: s.id,
      mode: s.mode,
      scene_key: s.scene_key,
      label: s.label,
      position: (i + 1) * 10,
      duration_sec: Math.max(0, Math.min(60, Number(s.duration_sec) || 0)),
      enabled: s.enabled,
    }));
    const { error } = await supabase.from("video_scenario_steps").upsert(rows, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error("Enregistrement échoué");
      return;
    }
    toast.success("Scénario enregistré");
    load();
  };

  const totalFixed = useMemo(
    () => steps.filter((s) => s.enabled).reduce((acc, s) => acc + (Number(s.duration_sec) || 0), 0),
    [steps],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-black">Ordre et durées des étapes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cet ordre est appliqué dans « Aperçu du scénario » de Studio Vidéo IA. Durée 0 = durée automatique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {MODES.map((m) => (
            <Button
              key={m.value}
              size="sm"
              variant={mode === m.value ? "default" : "outline"}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {steps.filter((s) => s.enabled).length} étape(s) active(s) · durées fixes cumulées : {totalFixed}s
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading || saving}>
              <RotateCcw className="h-4 w-4 mr-1" /> Recharger
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune étape configurée pour ce mode.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3 flex-wrap">
                <span className="w-8 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black">{s.label || s.scene_key}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{s.scene_key}</span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Durée
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={s.duration_sec}
                      onChange={(e) => patch(s.id, { duration_sec: Number(e.target.value) })}
                      className="w-16 h-8 text-xs"
                    />
                    s
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Actif
                    <Switch checked={s.enabled} onCheckedChange={(v) => patch(s.id, { enabled: v })} />
                  </label>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => move(i, 1)}
                      disabled={i === steps.length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoScenarioConfigPanel;
