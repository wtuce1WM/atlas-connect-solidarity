import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mic, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Voix off d'une étape de storyboard.
 *
 * Le MP3 est généré une fois (ElevenLabs via l'edge function `elevenlabs-tts`),
 * stocké dans le bucket `video-assets` et son URL persistée dans `config.voice`.
 * Le moteur Remotion ne synthétise jamais à la volée : le rendu reste
 * déterministe et la voix est réutilisable sans recoût.
 */

export const MAX_VOICE_CHARS = 700;

/** Voix ElevenLabs multilingues retenues pour le français. */
const VOICES: Array<{ id: string; label: string }> = [
  { id: "MmafIMKg28Wr0yMh8CEB", label: "Sarah — féminine, chaleureuse" },
  { id: "9BWtsMINqrJLrRacOk9x", label: "Aria — féminine, posée" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger — masculine, grave" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — masculine, narration" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam — masculine, jeune" },
];

export type StepVoice = {
  enabled?: boolean;
  text?: string;
  voiceId?: string;
  url?: string;
  gain?: number;
  duckBg?: number;
  delaySec?: number;
  generatedAt?: string;
  generatedFor?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const StepVoiceOverBlock = ({
  value,
  onChange,
  durationSec,
}: {
  value: StepVoice | null;
  onChange: (v: StepVoice | null) => void;
  durationSec: number;
}) => {
  const [busy, setBusy] = useState(false);
  const v = value ?? {};
  const text = v.text ?? "";
  const voiceId = v.voiceId ?? VOICES[0].id;
  const stale = Boolean(v.url) && v.generatedFor !== `${voiceId}::${text.trim()}`;

  const patch = (next: Partial<StepVoice>) => onChange({ ...v, ...next });

  const generate = async () => {
    const clean = text.trim();
    if (!clean) {
      toast.error("Saisis le texte de la voix off");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: clean.slice(0, MAX_VOICE_CHARS), voiceId, lang: "fr" },
      });
      if (error) throw error;
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data as ArrayBuffer], { type: "audio/mpeg" });
      if (blob.size < 500) throw new Error("Audio vide renvoyé par le service vocal");

      const path = `voiceover/${crypto.randomUUID()}.mp3`;
      const up = await supabase.storage
        .from("video-assets")
        .upload(path, blob, { contentType: "audio/mpeg", upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("video-assets").getPublicUrl(path);

      patch({
        enabled: true,
        text: clean,
        voiceId,
        url: pub.publicUrl,
        gain: v.gain ?? 1,
        duckBg: v.duckBg ?? 0.15,
        delaySec: v.delaySec ?? 0,
        generatedAt: new Date().toISOString(),
        generatedFor: `${voiceId}::${clean}`,
      });
      toast.success("Voix off générée — pense à enregistrer le storyboard");
    } catch (e: any) {
      toast.error(`Génération vocale échouée : ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 grid gap-3 form-legible">
      <div className="flex items-center gap-2 flex-wrap">
        <Mic className="h-4 w-4" />
        <span className="text-xs font-semibold">Voix off de l'étape</span>
        {v.url && !stale && (
          <Badge variant="outline" className="text-[10px]">
            MP3 prêt
          </Badge>
        )}
        {stale && (
          <Badge variant="destructive" className="text-[10px]">
            texte modifié — régénérer
          </Badge>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          Active
          <Switch
            checked={v.enabled !== false && Boolean(v.url)}
            disabled={!v.url}
            onCheckedChange={(c) => patch({ enabled: c })}
          />
        </label>
      </div>

      <label className="text-xs text-muted-foreground grid gap-1">
        Texte lu ({text.length}/{MAX_VOICE_CHARS} caractères)
        <Textarea
          rows={3}
          value={text}
          onChange={(e) => patch({ text: e.target.value.slice(0, MAX_VOICE_CHARS) })}
          className="text-xs"
          placeholder="Ce que la voix doit dire pendant cette étape…"
        />
        <span className="text-[11px]">
          Repère : ~15 caractères par seconde. Étape de {durationSec} s ≈ {Math.round(durationSec * 15)} caractères max
          pour rester dans la durée.
        </span>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-muted-foreground grid gap-1">
          Voix
          <select
            value={voiceId}
            onChange={(e) => patch({ voiceId: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            {VOICES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground grid gap-1">
          Décalage au démarrage (s)
          <Input
            type="number"
            min={0}
            max={Math.max(0, durationSec - 1)}
            step={0.5}
            value={v.delaySec ?? 0}
            onChange={(e) => patch({ delaySec: clamp(Number(e.target.value) || 0, 0, Math.max(0, durationSec - 1)) })}
            className="h-8 text-xs"
          />
        </label>
        <label className="text-xs text-muted-foreground grid gap-1">
          Volume de la voix (0 → 2)
          <Input
            type="number"
            min={0}
            max={2}
            step={0.05}
            value={v.gain ?? 1}
            onChange={(e) => patch({ gain: clamp(Number(e.target.value) || 0, 0, 2) })}
            className="h-8 text-xs"
          />
        </label>
        <label className="text-xs text-muted-foreground grid gap-1">
          Atténuation du son du média (0 = muet)
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={v.duckBg ?? 0.15}
            onChange={(e) => patch({ duckBg: clamp(Number(e.target.value) || 0, 0, 1) })}
            className="h-8 text-xs"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Mic className="h-3.5 w-3.5 mr-1.5" />}
          {v.url ? "Régénérer la voix" : "Générer la voix"}
        </Button>
        {v.url && (
          <>
            <audio src={v.url} controls className="h-8 max-w-[260px]" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Retirer
            </Button>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Le MP3 est stocké dans la bibliothèque vidéo : le rendu ne rappelle jamais le service vocal. Si une piste voix
        off est active sur au moins une étape, la vidéo est encodée avec son.
      </p>
    </div>
  );
};

export default StepVoiceOverBlock;
