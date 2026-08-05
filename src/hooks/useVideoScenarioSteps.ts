import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VideoScenarioStepConfig = {
  scene_key: string;
  position: number;
  duration_sec: number;
  enabled: boolean;
};

/**
 * Configuration backoffice (/staff/backoffice/videos) des étapes du scénario :
 * ordre + durée par défaut, par mode (établissement / corporate).
 */
export function useVideoScenarioSteps(mode: "business" | "corporate") {
  const [steps, setSteps] = useState<VideoScenarioStepConfig[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("video_scenario_steps")
        .select("scene_key, position, duration_sec, enabled")
        .eq("mode", mode)
        .order("position", { ascending: true });
      if (!cancelled) setSteps((data ?? []) as VideoScenarioStepConfig[]);
    };
    load();
    // Toute modification en backoffice est reprise immédiatement (temps réel + retour d'onglet).
    const channel = supabase
      .channel(`video_scenario_steps_${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_scenario_steps" }, () => {
        load();
      })
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [mode]);


  return steps;
}

/** Ordre des kinds actifs, tel que défini en backoffice. */
export function configOrder(steps: VideoScenarioStepConfig[]): string[] {
  return steps.filter((s) => s.enabled).map((s) => s.scene_key);
}

/** Durées fixes (>0) définies en backoffice, par kind. */
export function configDurations(steps: VideoScenarioStepConfig[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of steps) {
    if (s.enabled && Number(s.duration_sec) > 0) out[s.scene_key] = Number(s.duration_sec);
  }
  return out;
}

/**
 * Applique la configuration backoffice à un scénario :
 * réordonne les étapes, retire les étapes désactivées, force les durées fixes,
 * puis recalcule les points de départ et la durée totale.
 */
export function applyStepsConfig<T extends { scenes: any[]; totalDuration: number }>(
  scenario: T | null,
  steps: VideoScenarioStepConfig[],
): T | null {
  if (!scenario || !Array.isArray(scenario.scenes) || scenario.scenes.length === 0) return scenario;
  if (steps.length === 0) return scenario;

  const order = configOrder(steps);
  const durations = configDurations(steps);
  const disabled = new Set(steps.filter((s) => !s.enabled).map((s) => s.scene_key));
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const scenes = scenario.scenes
    .filter((s: any) => !disabled.has(String(s.icon)))
    .map((s: any, i: number) => ({ s, i }))
    .sort((a, b) => rank(String(a.s.icon)) - rank(String(b.s.icon)) || a.i - b.i)
    .map((x) => x.s);

  let cursor = 0;
  const out = scenes.map((s: any) => {
    const duration = durations[String(s.icon)] ?? s.duration;
    const scene = { ...s, duration, start: cursor };
    cursor += duration;
    return scene;
  });

  return { ...scenario, scenes: out, totalDuration: cursor || scenario.totalDuration };
}
