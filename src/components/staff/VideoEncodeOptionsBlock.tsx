import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AUDIO_BITRATES,
  DEFAULT_ENCODE,
  ENCODE_PRESETS,
  ENCODE_SCALES,
  type EncodeOptions,
  type EncodePresetId,
} from "@/lib/videoEncode";

/**
 * Bloc « Format et compression » partagé par les chaînes de rendu
 * (Promo business, Scénario Feed, Montages storyboard).
 *
 * Aucune logique métier : le bloc édite uniquement l'objet `encode` transmis
 * au worker de rendu.
 */
const VideoEncodeOptionsBlock = ({
  value,
  onChange,
  /** false quand la composition gère déjà sa résolution de sortie (storyboard). */
  showScale = true,
  className = "",
  /** Optionnel : lance un rendu par niveau de compression pour comparer poids/qualité. */
  onGenerateAll,
  generatingAll = false,
  /** true seulement sur les chaînes destinées à la surimpression (Promo business). */
  showTransparent = false,
}: {
  value: EncodeOptions | null | undefined;
  onChange: (next: EncodeOptions) => void;
  showScale?: boolean;
  className?: string;
  onGenerateAll?: () => void;
  generatingAll?: boolean;
  showTransparent?: boolean;
}) => {

  const v = value ?? DEFAULT_ENCODE;
  const patch = (p: Partial<EncodeOptions>) => onChange({ ...v, ...p });


  const selectPreset = (id: EncodePresetId) => {
    const preset = ENCODE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    patch({ preset: id, crf: preset.crf });
  };

  const activePreset = ENCODE_PRESETS.find((p) => p.id === v.preset);

  return (
    <div className={`rounded-lg border bg-muted/30 p-3 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-foreground">Format et compression</span>
        <Badge variant="outline" className="text-[10px]">
          CRF {v.crf}
          {v.scale !== 1 ? ` · ${Math.round(v.scale * 100)} %` : ""}
          {v.audio === "mute" ? " · muet" : ""}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label className="block text-xs font-medium">Niveau de compression</Label>
        <div className="flex flex-wrap gap-2">
          {ENCODE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPreset(p.id)}
              title={p.hint}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                p.id === v.preset
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
              <span className="ml-1 opacity-60">CRF {p.crf}</span>
            </button>
          ))}
        </div>
        {activePreset && <p className="text-[11px] text-muted-foreground">{activePreset.hint}</p>}
        {onGenerateAll && (
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={onGenerateAll}
              disabled={generatingAll}
              className="rounded-md border border-primary bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground hover:bg-primary/20 disabled:opacity-50"
            >
              {generatingAll
                ? "Lancement…"
                : `Générer les ${ENCODE_PRESETS.length} niveaux pour comparer`}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Crée {ENCODE_PRESETS.length} rendus identiques, un par niveau de compression (CRF{" "}
              {ENCODE_PRESETS.map((p) => p.crf).join(", ")}). Le nom du job indique le niveau.
            </p>
          </div>
        )}

      </div>

      {showScale && (
        <div className="space-y-2">
          <Label className="block text-xs font-medium">Résolution de sortie</Label>
          <div className="flex flex-wrap gap-2">
            {ENCODE_SCALES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => patch({ scale: s.value })}
                title={s.hint}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  Math.abs(s.value - v.scale) < 0.001
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Réduire la résolution est le levier le plus efficace : diviser la largeur par 2 divise le poids par 3
            à 4 sans toucher à la compression.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch
            id="encode-mute"
            checked={v.audio === "mute"}
            onCheckedChange={(checked) => patch({ audio: checked ? "mute" : "keep" })}
          />
          <Label htmlFor="encode-mute" className="text-xs font-medium">
            Supprimer la piste audio
          </Label>
        </div>
        {v.audio === "keep" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground">Débit audio</span>
            {AUDIO_BITRATES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => patch({ audioBitrate: b })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  b === v.audioBitrate
                    ? "border-primary bg-primary/10 font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Recommandé pour un hero autoplay : la lecture est obligatoirement muette, la piste ne sert à rien et
            pèse environ 30 % du fichier.
          </p>
        )}
      </div>

      {showTransparent && (
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center gap-3">
            <Switch
              id="encode-transparent"
              checked={v.transparent === true}
              onCheckedChange={(checked) => patch({ transparent: checked })}
            />
            <Label htmlFor="encode-transparent" className="text-xs font-medium">
              Fond transparent (WebM alpha, pour surimpression dans les montages)
            </Label>
          </div>
          {v.transparent ? (
            <p className="text-[11px] text-destructive">
              Sortie <strong>WebM VP9 alpha</strong> au lieu de MP4/H.264 : le fond derrière le mockup reste
              réellement vide (laisser « Fond derrière le mockup — URL /search » vide). Encodage plus lent et
              fichier plus lourd. À utiliser comme <strong>asset de montage uniquement</strong> : l'alpha VP9 est mal
              lu par Safari iOS, donc pas de diffusion publique directe.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Par défaut la sortie est un MP4/H.264 opaque (aucun canal alpha possible dans ce format).
            </p>
          )}
        </div>
      )}
    </div>

  );
};

export default VideoEncodeOptionsBlock;
