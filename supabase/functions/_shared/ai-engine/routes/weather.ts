// Extrait verbatim de supabase/functions/embed-ai-chat/index.ts (moteur A/B/C, étape 3).
// Aucune réécriture : le rendu est déjà validé en production.

import { normalize } from "./shared.ts";

export function isWeatherIntent(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (/\b(meteo|temps qu[' ]?il fait|quel temps|previsions?|temperature|degres?|il fait chaud|il fait froid|climat)\b/i.test(n)) return true;
  if (/\b(weather|forecast|how (?:hot|cold|warm) is it|what[' ]?s the weather|temperature)\b/i.test(n)) return true;
  if (/(الطقس|الجو|درجة الحرارة|توقعات)/.test(text)) return true;
  return false;
}
