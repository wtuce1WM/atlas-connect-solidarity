// Shared route detection used by the AI back-office tabs (Club + Embed).
export type Route = {
  key: "weather" | "tides" | "events" | "search" | "map" | "hours" | "booking" | "rating" | "distance" | "opennow" | "ordinal" | "count" | "llm";
  label: string;
  emoji: string;
  className: string;
};

export function detectRoute(label: string): Route {
  const q = (label || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!q.trim()) return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
  if (/\b(meteo|weather|forecast|temps|temperature|degres?|previsions?|il fait|quel temps)\b/.test(q))
    return { key: "weather", label: "get_weather", emoji: "🌤", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
  if (/\b(maree|marees|marnage|houle|vague|vagues|surf|basse mer|pleine mer|tide|tides|tidal|swell|sea level)\b/.test(q))
    return { key: "tides", label: "get_tides", emoji: "🌊", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300" };
  if (/\b(event|events|evenement|agenda|week[- ]?end|ce soir|festival|concert|expo|spectacle|whats on)\b/.test(q))
    return { key: "events", label: "search_events", emoji: "📅", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  if (/\b(horaire|horaires|ouvert|ouverts|ouverte|ouvertes|ouverture|ouvrir|ouvre|ouvrent|fermeture|fermer|ferme|ferment|tard|tot|early|late|open|close|closing|hours)\b/.test(q))
    return { key: "hours", label: "hours_ranking", emoji: "🕒", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" };
  if (/\b(reserv|book|booking|reserver|reservation)\b/.test(q))
    return { key: "booking", label: "booking", emoji: "🎟", className: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300" };
  if (/\b(mieux note|meilleur note|meilleure note|top note|plus davis|plus d avis|best.?rated|highest.?rated|top.?rated|most.?reviewed)\b/.test(q))
    return { key: "rating", label: "rating_ranking", emoji: "⭐", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300" };
  if (/\b(distance|distances|plus proche|plus pres|nearest|closest|le plus loin|farthest)\b/.test(q))
    return { key: "distance", label: "distance_ranking", emoji: "📏", className: "bg-teal-500/15 text-teal-700 dark:text-teal-300" };
  if (/\b(ouvert maintenant|open now|ouverts maintenant|open right now)\b/.test(q))
    return { key: "opennow", label: "open_filter", emoji: "🟢", className: "bg-green-500/15 text-green-700 dark:text-green-300" };
  if (/\b(premier|deuxieme|troisieme|first|second|third|numero \d|n°\s*\d)\b/.test(q))
    return { key: "ordinal", label: "ordinal_pick", emoji: "#️⃣", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" };
  if (/\b(combien|how many|count|nombre de resultats)\b/.test(q))
    return { key: "count", label: "count_priors", emoji: "🔢", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300" };
  if (/\b(carte|map|montre.*carte|show.*map|localise|coordonnees|contact|appeler|telephone)\b/.test(q))
    return { key: "map", label: "show_on_map", emoji: "🗺", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  if (/\b(que faire|sur place|proximite|autour|pres de|nearby|around|ou |où |restaurant|bar|cafe|the|rooftop|terrasse|musee|galerie|activite|activites|visite|visiter|beach[- ]?club|hotel|riad|spa|boutique|shopping|manger|boire|dejeuner|diner|sortie|things to do|what to do|where|point.*interet|interets?)\b/.test(q))
    return { key: "search", label: "search_businesses", emoji: "🔍", className: "bg-primary/15 text-primary" };
  return { key: "llm", label: "LLM direct", emoji: "💬", className: "bg-muted text-muted-foreground" };
}

export const RouteBadge = ({ label }: { label: string }) => {
  const r = detectRoute(label);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.className}`} title={`Route détectée: ${r.label}`}>
      <span>{r.emoji}</span>
      <span>{r.label}</span>
    </span>
  );
};
