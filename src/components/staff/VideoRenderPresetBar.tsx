import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, FilePlus2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * Barre « Enregistrer / Rendre » partagée par les chaînes Promo business et
 * Scénario Feed.
 *
 * Même discipline que les Montages storyboard : la configuration doit être
 * persistée (table video_render_presets) avant de pouvoir lancer un rendu.
 * Cela permet de préparer plusieurs configurations puis de lancer les rendus
 * en série, et de relancer un rendu à l'identique sans ressaisie.
 */
export type RenderPreset = {
  id: string;
  kind: "promo" | "feed";
  name: string;
  business_id: string | null;
  config: any;
  updated_at: string;
};

const stable = (v: any) => JSON.stringify(v ?? null);

const VideoRenderPresetBar = ({
  kind,
  config,
  businessId,
  defaultName,
  onApply,
  onDirtyChange,
}: {
  kind: "promo" | "feed";
  /** Configuration courante de l'écran (sérialisable). */
  config: any;
  businessId?: string | null;
  defaultName?: string;
  /** Applique une configuration enregistrée à l'écran. */
  onApply: (config: any) => void;
  /** true = des modifications ne sont pas enregistrées (Rendre doit être bloqué). */
  onDirtyChange: (dirty: boolean, presetId: string | null) => void;
}) => {
  const [presets, setPresets] = useState<RenderPreset[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savedConfig, setSavedConfig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("video_render_presets" as any)
      .select("id, kind, name, business_id, config, updated_at")
      .eq("kind", kind)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Chargement des configurations impossible");
      return;
    }
    setPresets((data ?? []) as unknown as RenderPreset[]);
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(
    () => savedConfig === null || stable(config) !== savedConfig,
    [config, savedConfig],
  );

  // Remonte l'état au parent sans boucler sur des références instables.
  const lastSent = useRef<string>("");
  useEffect(() => {
    const key = `${dirty}|${currentId ?? ""}`;
    if (key === lastSent.current) return;
    lastSent.current = key;
    onDirtyChange(dirty, currentId);
  }, [dirty, currentId, onDirtyChange]);

  const apply = (p: RenderPreset) => {
    setCurrentId(p.id);
    setName(p.name);
    setSavedConfig(stable(p.config));
    onApply(p.config);
    toast.success(`Configuration « ${p.name} » chargée`);
  };

  const saveExisting = async () => {
    if (!currentId) return;
    setBusy(true);
    const { error } = await supabase
      .from("video_render_presets" as any)
      .update({ name: name.trim() || defaultName || "Sans titre", config, business_id: businessId ?? null })
      .eq("id", currentId);
    setBusy(false);
    if (error) {
      toast.error(`Enregistrement impossible : ${error.message}`);
      return;
    }
    setSavedConfig(stable(config));
    toast.success("Configuration enregistrée");
    load();
  };

  const saveAsNew = async () => {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("video_render_presets" as any)
      .insert({
        kind,
        name: name.trim() || defaultName || `Configuration ${presets.length + 1}`,
        business_id: businessId ?? null,
        config,
        created_by: auth.user?.id ?? null,
      } as any)
      .select("id, kind, name, business_id, config, updated_at")
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error(`Création impossible : ${error?.message ?? "erreur"}`);
      return;
    }
    const row = data as unknown as RenderPreset;
    setCurrentId(row.id);
    setName(row.name);
    setSavedConfig(stable(row.config));
    toast.success("Nouvelle configuration créée");
    load();
  };

  const remove = async () => {
    if (!currentId) return;
    setBusy(true);
    const { error } = await supabase.from("video_render_presets" as any).delete().eq("id", currentId);
    setBusy(false);
    if (error) {
      toast.error(`Suppression impossible : ${error.message}`);
      return;
    }
    setCurrentId(null);
    setSavedConfig(null);
    setName("");
    toast.success("Configuration supprimée");
    load();
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-black">Configuration enregistrée</span>
        {currentId ? (
          dirty ? (
            <Badge variant="destructive" className="text-[10px]">
              modifications non enregistrées
            </Badge>
          ) : (
            <Badge className="text-[10px]">à jour</Badge>
          )
        ) : (
          <Badge variant="outline" className="text-[10px]">
            aucune configuration sélectionnée
          </Badge>
        )}
        <Button size="sm" variant="ghost" onClick={load} className="ml-auto">
          <RotateCcw className="h-4 w-4 mr-1" /> Rafraîchir
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName || "Nom de la configuration"}
          className="h-9 max-w-xs"
        />
        <Button size="sm" onClick={saveExisting} disabled={busy || !currentId}>
          <Save className="h-4 w-4 mr-1" /> Enregistrer
        </Button>
        <Button size="sm" variant="outline" onClick={saveAsNew} disabled={busy}>
          <FilePlus2 className="h-4 w-4 mr-1" /> Enregistrer comme nouvelle
        </Button>
        {currentId && (
          <Button size="sm" variant="ghost" onClick={remove} disabled={busy} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
          </Button>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => apply(p)}
              className={`rounded-full border px-3 py-1 text-xs ${
                p.id === currentId ? "border-primary bg-primary/10 text-black" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Le rendu part de la configuration enregistrée : enregistre d'abord, puis clique sur « Rendre ». Tu peux
        préparer plusieurs configurations et lancer les rendus les uns après les autres, ou relancer un rendu à
        l'identique depuis la liste des jobs.
      </p>
    </div>
  );
};

export default VideoRenderPresetBar;
