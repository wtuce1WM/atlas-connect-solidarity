// Règle UNIQUE de périmètre géographique du moteur IA (3 surfaces).
//
//   Les résultats sont TOUJOURS filtrés sur la ville du business master (host),
//   sauf si l'utilisateur nomme explicitement une autre ville dans son message.
//
// Rien d'autre ne peut élargir ou déplacer ce périmètre : ni `ai_suggestions.city`
// (qui ne pilote que la VISIBILITÉ de la suggestion), ni un relâchement automatique
// quand la ville de l'hôte rend peu de résultats.

const DEFAULT_CITY = "Marrakech";

export function resolveCityScope(opts: {
  hostCity?: string | null;
  activeCity?: string | null;
  /** Ville explicitement nommée dans le message utilisateur. */
  explicitCity?: string | null;
  /** `null` = pas de repli (périmètre national) ; sinon Marrakech par défaut. */
  fallback?: string | null;
}): string | null {
  const clean = (v: unknown) => String(v ?? "").trim();
  const fallback = opts.fallback === null ? "" : clean(opts.fallback) || DEFAULT_CITY;
  return (
    clean(opts.explicitCity) ||
    clean(opts.hostCity) ||
    clean(opts.activeCity) ||
    fallback ||
    null
  );
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .trim();

let cityCache: { at: number; rows: any[] } | null = null;

/** Détecte une ville explicitement nommée dans le texte (FR / EN / AR). */
export async function detectExplicitCity(
  admin: any,
  text: string,
): Promise<string | null> {
  const haystack = ` ${norm(text)} `;
  if (haystack.trim().length < 3) return null;
  try {
    if (!cityCache || Date.now() - cityCache.at > 5 * 60_000) {
      const { data } = await admin.from("cities").select("name_fr, name_en, name_ar");
      cityCache = { at: Date.now(), rows: data || [] };
    }
    for (const row of cityCache.rows) {
      const names = [row?.name_fr, row?.name_en, row?.name_ar].filter(Boolean) as string[];
      for (const n of names) {
        const nn = norm(n);
        if (nn.length > 2 && haystack.includes(` ${nn} `)) {
          return String(row.name_fr || row.name_en || n);
        }
      }
    }
  } catch (e) {
    console.warn("[ai-engine/city-scope] detectExplicitCity failed", String(e));
  }
  return null;
}
