// Moteur IA A/B/C — configurations de surface (spec §2)
import type { RouteCode, Surface } from "./types.ts";

export interface SurfaceConfig {
  surface: Surface;
  /** Sous ce seuil, le classifieur B escalade en C (fallback_reason = confidence_low). */
  confidenceThreshold: number;
  /** Nombre max de résultats rendus par défaut. */
  maxResults: number;
  /** Nombre de tours d'historique envoyés au modèle en classe C. */
  historyTurns: number;
  /** Périmètre géographique par défaut. */
  scope: "national" | "city" | "host_business";
  ton: string;
}

export const SURFACES: Record<Surface, SurfaceConfig> = {
  embed: {
    surface: "embed",
    confidenceThreshold: 0.45,
    maxResults: 6,
    historyTurns: 6,
    scope: "host_business",
    ton: "concierge de l'établissement hôte, direct, phrases courtes",
  },
  club: {
    surface: "club",
    confidenceThreshold: 0.6,
    maxResults: 8,
    historyTurns: 6,
    scope: "national",
    ton: "concierge Club, chaleureux, tutoiement, jamais de listes brutes",
  },
  search: {
    surface: "search",
    confidenceThreshold: 0.6,
    maxResults: 10,
    historyTurns: 6,
    scope: "city",
    ton: "assistant de recherche, factuel, orienté résultats",
  },
};

export function getSurfaceConfig(surface: Surface): SurfaceConfig {
  return SURFACES[surface] ?? SURFACES.club;
}

/** Politique projet : un seul modèle pour tous les appels. Le levier de coût est la classe. */
export const AI_MODEL = "openai/gpt-5.6-sol";

export function isRouteAllowedOnSurface(
  route: { enabled: boolean; surfaces: Surface[] },
  surface: Surface,
): boolean {
  return route.enabled && (route.surfaces ?? []).includes(surface);
}

export function routesForSurface(
  routes: Array<{ code: RouteCode; enabled: boolean; surfaces: Surface[] }>,
  surface: Surface,
): RouteCode[] {
  return routes.filter((r) => isRouteAllowedOnSurface(r, surface)).map((r) => r.code);
}
