// Moteur IA A/B/C — types partagés (spec: docs/ai/spec-moteur-abc.md)

export type AiClass = "A" | "B" | "C";

export type Surface = "club" | "embed" | "search";

export type RouteCode =
  | "weather"
  | "tides"
  | "nearby"
  | "booking"
  | "opening"
  | "reviews"
  | "events"
  | "map"
  | "pricing"
  | "discover"
  | "compare"
  | "itinerary"
  | "business_qa"
  | "out_of_scope"
  | "smalltalk";

export type FallbackReason =
  | null
  | "confidence_low"
  | "ambiguous"
  | "route_failed"
  | "route_disabled"
  | "no_results"
  | "empty_response"
  | "cache_hit";

export interface AiRouteRow {
  code: RouteCode;
  label: string;
  default_class: AiClass;
  enabled: boolean;
  surfaces: Surface[];
  editorial: Record<string, unknown> | null;
}

/** Contexte compact envoyé au classifieur (≈30 tokens). Jamais d'historique, jamais de fiches. */
export interface FocusContext {
  last_business_ids?: string[];
  last_business_names?: string[];
  last_route?: RouteCode | null;
  last_category?: string | null;
  active_city?: string | null;
}

/** Sortie unique du classifieur B. */
export interface ClassifierOutput {
  intent: string;
  category: string | null;
  exclude: string[];
  city: string | null;
  target_business_id: string | null;
  confidence: number;
}

export interface EngineRequest {
  message: string;
  surface: Surface;
  /** Route imposée par une suggestion / relance cliquée (curated input) → classe A directe. */
  curatedRoute?: RouteCode | null;
  focus?: FocusContext;
  activeCity?: string | null;
  hostBusinessId?: string | null;
  userId?: string | null;
  chatId?: string | null;
  language?: string | null;
}

export interface RouteResult {
  /** Markdown / texte prêt à rendre, ou null si la route n'a rien pu produire. */
  text: string | null;
  resultsCount?: number;
  businessIds?: string[];
  data?: Record<string, unknown>;
  failed?: boolean;
}

export interface EngineDecision {
  aiClass: AiClass;
  route: RouteCode;
  confidence: number | null;
  fallbackReason: FallbackReason;
}

export interface TurnLog extends EngineDecision {
  surface: Surface;
  model: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  latencyMsTotal?: number;
  latencyMsFirstToken?: number;
  resultsCount?: number;
  hadError?: boolean;
  streamCompleted?: boolean;
  cityActive?: string | null;
  cityDetected?: string | null;
  language?: string | null;
  chatId?: string | null;
  userId?: string | null;
  message?: string | null;
  /** Métriques de résolution taxonomique (observation seule). */
  resolvedTargets?: unknown;
  resolvedTypes?: string[] | null;
  resolutionUnresolved?: boolean | null;
  resolutionServiceOnly?: boolean | null;
}
