// Pré-vol des médias avant lancement d'un rendu Studio Vidéo IA.
// Objectif : éviter les jobs en erreur « Media invalide » (liens YouTube non
// rendables par Remotion, fichiers Storage supprimés → 404, types MIME faux).

export type PreflightEntry = {
  url: string;
  label: string;                       // ex. « Étape Hook — vidéo »
  kind: "image" | "video" | "audio" | "youtube";
};

export type PreflightIssue = {
  url: string;
  label: string;
  reason: string;
  severity: "block" | "warn";
};

export const isYoutubeUrl = (url: string) =>
  /(?:youtube\.com|youtu\.be)/i.test(url);

export const isRenderableVideoFile = (url: string) =>
  /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url);

export const isRenderableImageFile = (url: string) =>
  /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(url);

const withTimeout = async (input: string, init: RequestInit, ms: number) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

/** Vérifie l'accessibilité réelle d'une URL (HEAD, puis GET partiel en secours). */
const probe = async (url: string): Promise<{ ok: boolean; status: number | null; type: string | null }> => {
  try {
    const r = await withTimeout(url, { method: "HEAD", mode: "cors" }, 8000);
    if (r.status !== 405 && r.status !== 501) {
      return { ok: r.ok, status: r.status, type: r.headers.get("content-type") };
    }
  } catch {
    /* on tente le GET partiel */
  }
  try {
    const r = await withTimeout(url, { method: "GET", mode: "cors", headers: { Range: "bytes=0-0" } }, 10000);
    return { ok: r.ok || r.status === 206, status: r.status, type: r.headers.get("content-type") };
  } catch {
    return { ok: false, status: null, type: null };
  }
};

export async function preflightMedia(entries: PreflightEntry[]): Promise<PreflightIssue[]> {
  // Dédoublonnage par URL (on garde le premier libellé rencontré).
  const seen = new Map<string, PreflightEntry>();
  for (const e of entries) {
    if (!e?.url || typeof e.url !== "string") continue;
    if (!seen.has(e.url)) seen.set(e.url, e);
  }

  const issues: PreflightIssue[] = [];
  const toProbe: PreflightEntry[] = [];

  for (const e of seen.values()) {
    if (!/^https?:\/\//i.test(e.url)) {
      issues.push({ url: e.url, label: e.label, reason: "URL non absolue (http/https requis).", severity: "block" });
      continue;
    }
    if (isYoutubeUrl(e.url) || e.kind === "youtube") {
      issues.push({
        url: e.url,
        label: e.label,
        reason: "Lien YouTube : non rendable par Remotion. Utilisez un fichier .mp4/.mov/.webm (média internalisé).",
        severity: "block",
      });
      continue;
    }
    if (e.kind === "video" && !isRenderableVideoFile(e.url)) {
      issues.push({
        url: e.url,
        label: e.label,
        reason: "Extension vidéo non reconnue (attendu .mp4, .mov, .webm ou .m4v).",
        severity: "block",
      });
      continue;
    }
    toProbe.push(e);
  }

  // Sondage en parallèle limité.
  const chunk = 6;
  for (let i = 0; i < toProbe.length; i += chunk) {
    const batch = toProbe.slice(i, i + chunk);
    const res = await Promise.all(batch.map((e) => probe(e.url)));
    batch.forEach((e, idx) => {
      const r = res[idx];
      if (!r.ok) {
        if (r.status === null) {
          issues.push({
            url: e.url,
            label: e.label,
            reason: "Média injoignable depuis le navigateur (réseau/CORS). À vérifier avant le rendu.",
            severity: "warn",
          });
        } else {
          issues.push({
            url: e.url,
            label: e.label,
            reason: `Média inaccessible (HTTP ${r.status}) — fichier supprimé ou lien cassé.`,
            severity: "block",
          });
        }
        return;
      }
      const type = (r.type || "").toLowerCase();
      if (e.kind === "image" && type && !type.startsWith("image/") && !isRenderableImageFile(e.url)) {
        issues.push({ url: e.url, label: e.label, reason: `Type de contenu inattendu pour une image (${type}).`, severity: "warn" });
      }
      if (e.kind === "video" && type && !type.startsWith("video/") && !type.startsWith("application/octet-stream")) {
        issues.push({ url: e.url, label: e.label, reason: `Type de contenu inattendu pour une vidéo (${type}).`, severity: "warn" });
      }
      if (e.kind === "audio" && type && !type.startsWith("audio/") && !type.startsWith("application/octet-stream")) {
        issues.push({ url: e.url, label: e.label, reason: `Type de contenu inattendu pour une piste audio (${type}).`, severity: "warn" });
      }
    });
  }

  return issues;
}
