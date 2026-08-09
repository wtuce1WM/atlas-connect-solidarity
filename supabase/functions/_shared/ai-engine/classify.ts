// Moteur IA A/B/C — classifieur B (spec §2). Contrat strict : ni historique, ni fiches.
import { AI_MODEL, getSurfaceConfig } from "./surfaces.ts";
import { GATEWAY_URL, normalizeGatewayBodyForModel } from "../ai-gateway.ts";
import type { ClassifierOutput, EngineRequest, FocusContext, Surface } from "./types.ts";


const SYSTEM = `Tu es un classifieur d'intention pour un annuaire d'établissements au Maroc.
Tu ne réponds JAMAIS à l'utilisateur. Tu renvoies uniquement un objet JSON.

Champs:
- intent: "search" | "business_qa" | "compare" | "itinerary" | "other"
- category: catégorie demandée en français singulier (restaurant, hotel, bar, spa, riad, cafe, activite, boutique...) ou null
- exclude: catégories explicitement exclues par l'utilisateur (ex: "pas un hotel" -> ["hotel"]), sinon []
- city: ville citée dans le message, sinon null
- target_business_id: si le message reprend un établissement du focus context (pronom, "celui-là", nom partiel), renvoie son id. Sinon null.
- confidence: 0 à 1, ta confiance dans cette classification.

Règles: si le message est une reprise pronominale et que le focus context est vide, mets confidence < 0.4.
Réponds avec le JSON seul, sans texte autour.`;

function compactFocus(focus?: FocusContext): string {
  if (!focus) return "{}";
  const compact: Record<string, unknown> = {};
  if (focus.last_business_ids?.length) compact.last_business_ids = focus.last_business_ids.slice(0, 3);
  if (focus.last_business_names?.length) compact.last_business_names = focus.last_business_names.slice(0, 3);
  if (focus.last_route) compact.last_route = focus.last_route;
  if (focus.last_category) compact.last_category = focus.last_category;
  if (focus.active_city) compact.active_city = focus.active_city;
  return JSON.stringify(compact);
}

export interface ClassifyResult {
  output: ClassifierOutput | null;
  tokensIn: number;
  tokensOut: number;
  model: string;
  error?: string;
}

export const EMPTY_CLASSIFY: ClassifierOutput = {
  intent: "other",
  category: null,
  exclude: [],
  city: null,
  target_business_id: null,
  confidence: 0,
};

export async function classify(
  req: Pick<EngineRequest, "message" | "surface" | "focus">,
  lovableApiKey: string,
): Promise<ClassifyResult> {
  const user = `surface: ${req.surface}
focus: ${compactFocus(req.focus)}
message: ${req.message}`;

  try {
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = (await resp.text()).slice(0, 300);
      return { output: null, tokensIn: 0, tokensOut: 0, model: AI_MODEL, error: text };
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
    }

    const output: ClassifierOutput = {
      intent: typeof parsed.intent === "string" ? parsed.intent : "other",
      category: typeof parsed.category === "string" ? parsed.category : null,
      exclude: Array.isArray(parsed.exclude) ? parsed.exclude.filter((x: unknown) => typeof x === "string") : [],
      city: typeof parsed.city === "string" ? parsed.city : null,
      target_business_id: typeof parsed.target_business_id === "string" ? parsed.target_business_id : null,
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0,
    };

    return {
      output,
      tokensIn: json?.usage?.prompt_tokens ?? 0,
      tokensOut: json?.usage?.completion_tokens ?? 0,
      model: AI_MODEL,
    };
  } catch (e) {
    return { output: null, tokensIn: 0, tokensOut: 0, model: AI_MODEL, error: String(e) };
  }
}

/** Vrai si la sortie du classifieur est exploitable sur cette surface. */
export function isConfident(output: ClassifierOutput | null, surface: Surface): boolean {
  if (!output) return false;
  return output.confidence >= getSurfaceConfig(surface).confidenceThreshold;
}
