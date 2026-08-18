/**
 * Options de format et compression des rendus vidéo.
 *
 * Constat mesuré (ffprobe + SSIM) : le worker encodait tous les rendus en
 * `crf: 16` / `jpegQuality: 100`, soit un réglage quasi-master produisant des
 * fichiers de 20 à 50 Mo. Ces options permettent de viser un poids minimal
 * tout en restant exploitable en web (hero, feed, partage).
 *
 * Les valeurs sont transmises telles quelles dans `template_props.encode` et
 * consommées par `remotion/scripts/render-job.mjs`.
 */

export type EncodePresetId = "master" | "quality" | "balanced" | "light" | "minimum";

export type EncodeOptions = {
  /** Préréglage choisi (sert seulement à l'affichage / rechargement). */
  preset: EncodePresetId;
  /** Constant Rate Factor x264 : plus haut = plus léger. */
  crf: number;
  /** Facteur de résolution de sortie (1 = résolution native de la composition). */
  scale: number;
  /** Piste audio conservée ou supprimée (une piste muette pèse ~30 % du fichier). */
  audio: "keep" | "mute";
  /** Débit audio quand la piste est conservée. */
  audioBitrate: string;
  /**
   * Rendu à fond transparent (canal alpha).
   *
   * H.264/MP4 n'a pas de canal alpha : ce mode force une sortie **WebM VP9
   * `yuva420p`**, destinée à la surimpression dans les montages. Ce n'est pas
   * un livrable public (alpha VP9 mal supporté par Safari iOS).
   */
  transparent?: boolean;
};


export const ENCODE_PRESETS: {
  id: EncodePresetId;
  label: string;
  crf: number;
  hint: string;
}[] = [
  {
    id: "master",
    label: "Master",
    crf: 20,
    hint: "Archivage / remontage. Très lourd, aucune perte visible.",
  },
  {
    id: "quality",
    label: "Qualité préservée",
    crf: 24,
    hint: "Poids ÷ 4 environ. Aucune perte perceptible sur écran large.",
  },
  {
    id: "balanced",
    label: "Équilibré",
    crf: 28,
    hint: "Recommandé. Poids ÷ 10 environ, SSIM ≈ 0,97 sur nos mesures.",
  },
  {
    id: "light",
    label: "Léger",
    crf: 31,
    hint: "Pour du web embarqué. Léger lissage sur les scènes chargées.",
  },
  {
    id: "minimum",
    label: "Minimum exploitable",
    crf: 34,
    hint: "Le plus léger encore utilisable. Flou visible sur feuillage / foule.",
  },
];

export const ENCODE_SCALES: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "100 %", hint: "Résolution native de la composition" },
  { value: 0.75, label: "75 %", hint: "1080p → 810p, 720p → 540p" },
  { value: 0.6667, label: "67 %", hint: "1080p → 720p" },
  { value: 0.5, label: "50 %", hint: "1080p → 540p, idéal mobile / hero léger" },
];

export const AUDIO_BITRATES = ["64k", "96k", "128k"];

/** Défaut appliqué à toute nouvelle configuration de rendu. */
export const DEFAULT_ENCODE: EncodeOptions = {
  preset: "balanced",
  crf: 28,
  scale: 1,
  audio: "keep",
  audioBitrate: "96k",
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Normalise une valeur venant de la base (configuration enregistrée, job relancé). */
export const normalizeEncode = (raw: unknown): EncodeOptions => {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ENCODE };
  const r = raw as Partial<EncodeOptions>;
  const presetIds = ENCODE_PRESETS.map((p) => p.id);
  const preset = presetIds.includes(r.preset as EncodePresetId)
    ? (r.preset as EncodePresetId)
    : DEFAULT_ENCODE.preset;
  const crf = typeof r.crf === "number" && Number.isFinite(r.crf)
    ? Math.round(clamp(r.crf, 14, 40))
    : (ENCODE_PRESETS.find((p) => p.id === preset)?.crf ?? DEFAULT_ENCODE.crf);
  const scale = typeof r.scale === "number" && r.scale > 0 && r.scale <= 1 ? r.scale : 1;
  return {
    preset,
    crf,
    scale,
    audio: r.audio === "mute" ? "mute" : "keep",
    audioBitrate: AUDIO_BITRATES.includes(String(r.audioBitrate)) ? String(r.audioBitrate) : DEFAULT_ENCODE.audioBitrate,
  };
};

/** Résumé court pour les badges de la liste des jobs. */
export const encodeSummary = (raw: unknown): string => {
  const e = normalizeEncode(raw);
  const label = ENCODE_PRESETS.find((p) => p.id === e.preset)?.label ?? e.preset;
  const bits = [`${label} (CRF ${e.crf})`];
  if (e.scale !== 1) bits.push(`${Math.round(e.scale * 100)} %`);
  if (e.audio === "mute") bits.push("muet");
  return bits.join(" · ");
};
