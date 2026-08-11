// Client partagé du moteur IA unifié (edge function `embed-ai-chat-v2`).
// Une seule fonction moteur, trois surfaces (`embed`, `club`, `search`).
// Le moteur renvoie un UIMessageStream (AI SDK v5) : texte + marqueurs HTML
// (SHOW_ON_MAP, KNOWN_BUSINESSES, …). Ce helper lit le flux et extrait les marqueurs,
// pour éviter de dupliquer ce parsing dans chaque surface.

export type AiEngineSurface = "embed" | "search" | "club";

export interface AiEngineKnownBusiness { id: string; slug: string | null; name: string }

export interface AiEngineMapPayload {
  title?: string | null;
  order?: string | null;
  businesses: Array<Record<string, unknown>>;
}

export interface AiEngineTurn { role: "user" | "assistant"; content: string }

export interface AiEngineRequest {
  surface: AiEngineSurface;
  message: string;
  /** Historique (hors message courant), tronqué côté serveur selon la surface. */
  history?: AiEngineTurn[];
  /** Obligatoire pour la surface `embed` uniquement. */
  businessSlug?: string | null;
  activeCity?: string | null;
  language?: string | null;
  userCoords?: { lat: number; lng: number } | null;
  sessionId?: string | null;
  messageIndex?: number | null;
  suggestionId?: string | null;
  followupId?: string | null;
  signal?: AbortSignal;
  /** Appelé à chaque delta avec le texte cumulé nettoyé des marqueurs. */
  onDelta?: (cleanTextSoFar: string) => void;
}

export interface AiEngineResult {
  /** Texte prêt à rendre, marqueurs retirés. */
  text: string;
  raw: string;
  known: AiEngineKnownBusiness[];
  maps: AiEngineMapPayload[];
  /** Autres marqueurs bruts (clé = nom du marqueur, valeur = payloads JSON). */
  payloads: Record<string, unknown[]>;
}

const MARKER_RE = /<!--([A-Z_]+):([\s\S]*?)-->/g;

/** Retire les marqueurs (complets ou tronqués en fin de flux) et collecte leurs payloads. */
export function extractEngineMarkers(raw: string): Omit<AiEngineResult, "raw"> {
  const payloads: Record<string, unknown[]> = {};
  const known: AiEngineKnownBusiness[] = [];
  const maps: AiEngineMapPayload[] = [];
  if (!raw) return { text: "", known, maps, payloads };

  let text = raw.replace(MARKER_RE, (_m, name: string, body: string) => {
    let parsed: unknown = null;
    try { parsed = JSON.parse(String(body).replace(/--&gt;/g, "-->")); } catch { parsed = null; }
    if (parsed !== null) {
      (payloads[name] ||= []).push(parsed);
      if (name === "KNOWN_BUSINESSES" && Array.isArray(parsed)) {
        for (const b of parsed as Array<Record<string, any>>) {
          if (b?.id && b?.name) known.push({ id: String(b.id), slug: b.slug ?? null, name: String(b.name) });
        }
      }
      if (name === "SHOW_ON_MAP") {
        const p = parsed as AiEngineMapPayload;
        if (p && Array.isArray(p.businesses) && p.businesses.length) {
          maps.push({ title: p.title ?? null, order: p.order ?? null, businesses: p.businesses });
        }
      }
    }
    return "";
  });

  // Marqueur encore incomplet pendant le streaming : ne jamais l'afficher.
  text = text.replace(/<!--[A-Z_]*:?[\s\S]*$/, "").trim();
  return { text, known, maps, payloads };
}

/** Appel streaming du moteur unifié. Résout quand le flux est terminé. */
export async function callAiEngine(req: AiEngineRequest): Promise<AiEngineResult> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-ai-chat-v2`;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const messages = [
    ...(req.history ?? []).map((t, i) => ({
      id: `h-${i}`,
      role: t.role,
      parts: [{ type: "text", text: t.content }],
    })),
    { id: `u-${Date.now()}`, role: "user", parts: [{ type: "text", text: req.message }] },
  ];

  const resp = await fetch(url, {
    method: "POST",
    signal: req.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify({
      messages,
      surface: req.surface,
      businessSlug: req.businessSlug || undefined,
      activeCity: req.activeCity || undefined,
      language: req.language || undefined,
      userCoords: req.userCoords || undefined,
      sessionId: req.sessionId || undefined,
      messageIndex: req.messageIndex ?? undefined,
      suggestionId: req.suggestionId || undefined,
      followupId: req.followupId || undefined,
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`ai-engine ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 200)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";

  const pushLine = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    try {
      const evt = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
      if (evt?.type === "text-delta" && typeof evt.delta === "string") raw += evt.delta;
      else if (evt?.type === "text" && typeof evt.text === "string") raw += evt.text;
    } catch { /* ligne non JSON : ignorée */ }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, "");
      buffer = buffer.slice(idx + 1);
      pushLine(line);
    }
    req.onDelta?.(extractEngineMarkers(raw).text);
  }
  if (buffer) pushLine(buffer.replace(/\r$/, ""));

  return { raw, ...extractEngineMarkers(raw) };
}
