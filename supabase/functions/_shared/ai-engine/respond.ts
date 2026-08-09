// Moteur IA A/B/C — response builder (spec §5.2)
// Classe A/B : template déterministe (zéro token de génération).
// Classe C : appel générateur avec contexte injecté + 6 derniers tours max.

import { AI_MODEL, getSurfaceConfig } from "./surfaces.ts";
import { GATEWAY_URL } from "../ai-gateway.ts";
import type { RouteResult, Surface } from "./types.ts";

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  surface: Surface;
  message: string;
  /** Contexte déterministe déjà résolu par le code (fiches, résultats, ville…). */
  context?: string;
  history?: HistoryTurn[];
  language?: string | null;
  stream?: boolean;
}

/** Classe A/B : rend le résultat déterministe tel quel. */
export function respondDeterministic(result: RouteResult): RouteResult {
  return result;
}

function systemPrompt(surface: Surface, language?: string | null): string {
  const cfg = getSurfaceConfig(surface);
  return `Tu es l'assistant One World Morocco (surface: ${surface}).
Ton: ${cfg.ton}.
Tu ne t'appuies QUE sur le contexte fourni. Si le contexte ne contient pas la réponse, dis-le en une phrase et propose une reformulation.
N'invente jamais un établissement, un prix, un horaire ou un avis.
Réponds en ${language || "français"}, en 120 mots maximum.`;
}

/** Classe C : appel générateur. Historique tronqué à historyTurns (spec §3). */
export async function generate(
  opts: GenerateOptions,
  lovableApiKey: string,
): Promise<{ response: Response | null; model: string; error?: string }> {
  const cfg = getSurfaceConfig(opts.surface);
  const history = (opts.history ?? []).slice(-cfg.historyTurns * 2);

  const messages = [
    { role: "system", content: systemPrompt(opts.surface, opts.language) },
    ...history,
    {
      role: "user",
      content: opts.context
        ? `Contexte:\n${opts.context}\n\nQuestion: ${opts.message}`
        : opts.message,
    },
  ];

  try {
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({ model: AI_MODEL, messages, stream: opts.stream ?? false }),
    });
    if (!resp.ok) {
      return { response: null, model: AI_MODEL, error: (await resp.text()).slice(0, 300) };
    }
    return { response: resp, model: AI_MODEL };
  } catch (e) {
    return { response: null, model: AI_MODEL, error: String(e) };
  }
}
