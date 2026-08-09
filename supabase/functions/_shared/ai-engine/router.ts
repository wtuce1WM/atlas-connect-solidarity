// Moteur IA A/B/C — routeur (spec §5.2)
// Curated input (suggestion / relance cliquée) → route directe, classe A, zéro token.
// Free input → classifieur B, escalade C si nécessaire.

import { classify, EMPTY_CLASSIFY, isConfident } from "./classify.ts";
import { isRouteAllowedOnSurface } from "./surfaces.ts";
import type {
  AiRouteRow,
  ClassifierOutput,
  EngineDecision,
  EngineRequest,
  RouteCode,
} from "./types.ts";

export interface RoutingOutcome extends EngineDecision {
  classifier: ClassifierOutput | null;
  tokensIn: number;
  tokensOut: number;
  model: string | null;
}

export async function loadRoutes(supabase: any): Promise<AiRouteRow[]> {
  const { data, error } = await supabase
    .from("ai_routes")
    .select("code, label, default_class, enabled, surfaces, editorial");
  if (error) {
    console.error("[ai-engine/router] loadRoutes failed", error);
    return [];
  }
  return (data ?? []) as AiRouteRow[];
}

function findRoute(routes: AiRouteRow[], code: RouteCode | null | undefined): AiRouteRow | null {
  if (!code) return null;
  return routes.find((r) => r.code === code) ?? null;
}

/** Map l'intention du classifieur vers une route métier. */
export function intentToRoute(output: ClassifierOutput): RouteCode {
  switch (output.intent) {
    case "search":
      return "discover";
    case "business_qa":
      return "business_qa";
    case "compare":
      return "compare";
    case "itinerary":
      return "itinerary";
    default:
      return "out_of_scope";
  }
}

export async function route(
  req: EngineRequest,
  routes: AiRouteRow[],
  lovableApiKey: string,
): Promise<RoutingOutcome> {
  // 1. Curated input → route imposée, aucune classification.
  const curated = findRoute(routes, req.curatedRoute);
  if (curated) {
    if (!isRouteAllowedOnSurface(curated, req.surface)) {
      return {
        aiClass: "C",
        route: curated.code,
        confidence: null,
        fallbackReason: "route_disabled",
        classifier: null,
        tokensIn: 0,
        tokensOut: 0,
        model: null,
      };
    }
    return {
      aiClass: curated.default_class,
      route: curated.code,
      confidence: null,
      fallbackReason: null,
      classifier: null,
      tokensIn: 0,
      tokensOut: 0,
      model: null,
    };
  }

  // 2. Free input → classifieur B.
  const result = await classify(req, lovableApiKey);
  const output = result.output;

  if (!output || result.error) {
    return {
      aiClass: "C",
      route: "discover",
      confidence: output?.confidence ?? null,
      fallbackReason: "route_failed",
      classifier: output ?? EMPTY_CLASSIFY,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      model: result.model,
    };
  }

  const ambiguous =
    output.confidence > 0 &&
    output.confidence < 0.4 &&
    !output.target_business_id &&
    !(req.focus?.last_business_ids?.length);

  if (!isConfident(output, req.surface)) {
    return {
      aiClass: "C",
      route: intentToRoute(output),
      confidence: output.confidence,
      fallbackReason: ambiguous ? "ambiguous" : "confidence_low",
      classifier: output,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      model: result.model,
    };
  }

  const target = findRoute(routes, intentToRoute(output));
  if (!target || !isRouteAllowedOnSurface(target, req.surface)) {
    return {
      aiClass: "C",
      route: intentToRoute(output),
      confidence: output.confidence,
      fallbackReason: "route_disabled",
      classifier: output,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      model: result.model,
    };
  }

  return {
    aiClass: target.default_class,
    route: target.code,
    confidence: output.confidence,
    fallbackReason: null,
    classifier: output,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    model: result.model,
  };
}
