// Catalogue des routes forçables en back-office (champ `route_override` de
// `ai_suggestions` / `ai_followups`). Miroir strict de
// `supabase/functions/_shared/ai-engine/routes/forced.ts` : toute nouvelle clé
// doit être ajoutée des deux côtés ET dans la contrainte CHECK en base.

export type ForcedRouteKey =
  | "search_businesses"
  | "show_on_map"
  | "contacts"
  | "opening_hours"
  | "hours_ranking_opens_first"
  | "hours_ranking_closes_last"
  | "open_now"
  | "booking"
  | "distance_ranking_closest"
  | "distance_ranking_farthest"
  | "rating_best"
  | "rating_most_reviewed"
  | "weather"
  | "tides"
  | "poi_nearby"
  | "nearby_overview"
  | "describe"
  | "count"
  | "llm";

export const FORCED_ROUTES: Array<{ key: ForcedRouteKey; label: string; hint: string }> = [
  { key: "search_businesses", label: "🔍 Recherche d'établissements", hint: "Recherche déterministe puis synthèse (comportement par défaut du moteur)." },
  { key: "show_on_map", label: "🗺 Afficher sur la carte", hint: "Recentre la carte sur les établissements du tour précédent." },
  { key: "contacts", label: "📞 Coordonnées (tél / WhatsApp)", hint: "Téléphone, WhatsApp et adresse des établissements présentés." },
  { key: "opening_hours", label: "🕒 Horaires", hint: "Horaires détaillés des établissements présentés (ou de l'hôte)." },
  { key: "hours_ranking_opens_first", label: "🌅 Qui ouvre le plus tôt", hint: "Classement par heure d'ouverture." },
  { key: "hours_ranking_closes_last", label: "🌙 Qui ferme le plus tard", hint: "Classement par heure de fermeture." },
  { key: "open_now", label: "🟢 Ouvert maintenant", hint: "Filtre sur les établissements ouverts à l'instant." },
  { key: "booking", label: "🎟 Réservation en ligne", hint: "Liens de réservation, téléphone et WhatsApp." },
  { key: "distance_ranking_closest", label: "📏 Les plus proches", hint: "Classement par distance croissante depuis l'hôte." },
  { key: "distance_ranking_farthest", label: "📏 Les plus éloignés", hint: "Classement par distance décroissante depuis l'hôte." },
  { key: "rating_best", label: "⭐ Les mieux notés", hint: "Classement par note." },
  { key: "rating_most_reviewed", label: "⭐ Les plus commentés", hint: "Classement par nombre d'avis." },
  { key: "weather", label: "🌤 Météo (widget)", hint: "Widget météo de la ville active." },
  { key: "tides", label: "🌊 Marées (widget)", hint: "Widget marées / vent de la ville côtière." },
  { key: "poi_nearby", label: "📍 Points d'intérêt à proximité", hint: "Uniquement les POI dans le rayon de proximité." },
  { key: "nearby_overview", label: "🧭 Aperçu à proximité", hint: "Panorama des établissements 1WM dans le rayon." },
  { key: "describe", label: "📝 Détailler les résultats", hint: "Détail cuisine / ambiance / services des établissements présentés." },
  { key: "count", label: "🔢 Comptage", hint: "Nombre d'établissements du tour précédent." },
  { key: "llm", label: "💬 LLM direct", hint: "Réponse générative, sans route déterministe." },
];

export const forcedRouteLabel = (key?: string | null): string | null =>
  (key && FORCED_ROUTES.find((r) => r.key === key)?.label) || null;
