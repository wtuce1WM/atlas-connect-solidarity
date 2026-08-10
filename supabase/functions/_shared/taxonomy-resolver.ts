// Résolveur taxonomique partagé — autorité unique « terme utilisateur → cible typée ».
//
// Pourquoi ce module : la détection de sous-catégories / services existait uniquement
// dans business-search (logique impérative, ~700 lignes) et n'était pas accessible au
// moteur IA A/B/C. Résultat mesuré sur 14 439 recherches : 19,8 % des requêtes touchent
// un libellé de service réel sans être reconnues comme telles (échec silencieux), et
// « quad marrakech » renvoyait 0 résultat alors que 32 établissements sont rattachés au quad.
//
// Règle stricte : ce module NE DÉCIDE JAMAIS du filtrage. Il retourne des cibles typées
// ordonnées par force de correspondance. C'est l'appelant qui choisit filtre dur ou
// facteur de ranking (un service reste un facteur, jamais un filtre éliminatoire).

export type TargetType =
  | "category"
  | "subcategory"
  | "service"
  | "badge"
  | "engagement"
  | "commodity"
  | "city"
  | "neighborhood";

/** Force de la correspondance, du plus fort au plus faible. */
export type MatchStrength = "exact" | "phrase" | "word" | "synonym";

export interface ResolvedTarget {
  type: TargetType;
  /** Valeur canonique en base (name_fr, ou id pour un badge). */
  value: string;
  strength: MatchStrength;
  /** Colonne d'origine, pour le debug et les métriques. */
  source: string;
  /** Portion de la requête qui a déclenché la correspondance. */
  matched: string;
}

export interface TaxonomyVocabulary {
  /** Entrées littérales : terme normalisé → cibles. */
  entries: Map<string, ResolvedTarget[]>;
  /** Synonymes : terme normalisé → cibles (mappings de search_synonyms). */
  synonymEntries: Map<string, ResolvedTarget[]>;
  /**
   * Expansion par mot : mot au singulier → services dont le libellé contient ce mot.
   * Indispensable pour « quad », qui doit remonter `Quad` ET `Excursions en quad` —
   * filtrer sur le seul libellé exact raterait la majorité des 32 établissements concernés.
   */
  wordToServices: Map<string, Set<string>>;
  loadedAt: number;
  counts: Record<string, number>;
}


const VOCAB_TTL_MS = 5 * 60 * 1000;
let cachedVocab: TaxonomyVocabulary | null = null;

/** Minuscules, sans accents, espaces normalisés, ponctuation réduite. */
export function normalizeTerm(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vrai si `needle` apparaît dans `haystack` sur des frontières de mot. */
export function containsOnWordBoundary(haystack: string, needle: string): boolean {
  if (!needle) return false;
  let from = 0;
  while (true) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return false;
    const before = at === 0 ? " " : haystack[at - 1];
    const afterIdx = at + needle.length;
    const after = afterIdx >= haystack.length ? " " : haystack[afterIdx];
    if (!/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after)) return true;
    from = at + 1;
  }
}

/** Mots-outils écartés de l'index par mot (ils ne discriminent rien). */
const STOP_WORDS = new Set([
  "de", "des", "du", "la", "le", "les", "en", "et", "aux", "au", "un", "une", "dans", "sur", "pour",
  "avec", "par", "chez", "sans", "plus", "the", "of", "and", "for", "with", "near", "salle",
]);

/** Pluriel simple rabattu au singulier, pour que « vélos » et « vélo » partagent une clé. */
export function stemKey(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

/** Mots significatifs d'un libellé. */
export function contentWords(text: string): string[] {
  return normalizeTerm(text)
    .split(" ")
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}


function push(map: Map<string, ResolvedTarget[]>, term: string, target: Omit<ResolvedTarget, "matched">) {
  const key = normalizeTerm(term);
  // Un terme d'un seul caractère ou vide n'est jamais discriminant.
  if (key.length < 3) return;
  const list = map.get(key) ?? [];
  // Pas de doublon type+value pour un même terme.
  if (list.some((t) => t.type === target.type && t.value === target.value)) return;
  list.push({ ...target, matched: key });
  map.set(key, list);
}

/** Lecture paginée : `services` dépasse la limite de 1000 lignes du client. */
async function selectAll(admin: any, table: string, columns: string, apply?: (q: any) => any) {
  const rows: any[] = [];
  for (let page = 0; page < 6; page++) {
    let q = admin.from(table).select(columns);
    if (apply) q = apply(q);
    const { data, error } = await q.range(page * 1000, page * 1000 + 999);

    if (error) {
      console.error(`[taxonomy-resolver] load_error table=${table}`, error.message);
      break;
    }
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

export async function loadTaxonomyVocabulary(admin: any, force = false): Promise<TaxonomyVocabulary> {
  if (!force && cachedVocab && Date.now() - cachedVocab.loadedAt < VOCAB_TTL_MS) return cachedVocab;

  const [subcats, services, synonyms, categories, cities, neighborhoods] = await Promise.all([
    selectAll(admin, "subcategories", "name_fr, name_en, name_ar, keywords"),
    selectAll(admin, "services", "name_fr, name_en, name_ar, keywords", (q) => q.eq("is_active", true)),
    selectAll(
      admin,
      "search_synonyms",
      "key_word, key_word_en, key_word_ar, synonyms, synonyms_en, synonyms_ar, subcategory_names, service_names, badge_id, engagement_filters, commodity_filters",
      (q) => q.eq("is_active", true),
    ),
    selectAll(admin, "categories", "name_fr, name_en, name_ar"),
    selectAll(admin, "cities", "name"),
    selectAll(admin, "neighborhoods", "name"),
  ]);

  const entries = new Map<string, ResolvedTarget[]>();
  const synonymEntries = new Map<string, ResolvedTarget[]>();
  const wordToServices = new Map<string, Set<string>>();


  // 1-2. Sous-catégories : noms puis keywords.
  for (const sc of subcats) {
    const value = sc.name_fr;
    if (!value) continue;
    for (const name of [sc.name_fr, sc.name_en, sc.name_ar]) {
      if (name) push(entries, name, { type: "subcategory", value, source: "subcategories.name" });
    }
    for (const k of sc.keywords ?? []) {
      if (k) push(entries, k, { type: "subcategory", value, source: "subcategories.keywords" });
    }
  }

  // 3-4. Services : noms puis keywords. 1 269 libellés distincts.
  for (const sv of services) {
    const value = sv.name_fr;
    if (!value) continue;
    for (const name of [sv.name_fr, sv.name_en, sv.name_ar]) {
      if (name) push(entries, name, { type: "service", value, source: "services.name" });
    }
    for (const k of sv.keywords ?? []) {
      if (k) push(entries, k, { type: "service", value, source: "services.keywords" });
    }
    // Index par mot : « quad » doit atteindre `Quad` et `Excursions en quad`.
    for (const w of contentWords(value)) {
      const key = stemKey(w);
      const set = wordToServices.get(key) ?? new Set<string>();
      set.add(value);
      wordToServices.set(key, set);
    }
  }


  // 6. Catégories.
  for (const c of categories) {
    const value = c.name_fr;
    if (!value) continue;
    for (const name of [c.name_fr, c.name_en, c.name_ar]) {
      if (name) push(entries, name, { type: "category", value, source: "categories.name" });
    }
  }

  // Géo.
  for (const c of cities) if (c.name) push(entries, c.name, { type: "city", value: c.name, source: "cities.name" });
  for (const n of neighborhoods) {
    if (n.name) push(entries, n.name, { type: "neighborhood", value: n.name, source: "neighborhoods.name" });
  }

  // 5. Synonymes : chaque clé/variante pointe vers les mappings curés.
  for (const row of synonyms) {
    const keys = [row.key_word, row.key_word_en, row.key_word_ar, ...(row.synonyms ?? []), ...(row.synonyms_en ?? []), ...(row.synonyms_ar ?? [])]
      .filter(Boolean)
      .map((k: string) => String(k));
    const targets: Omit<ResolvedTarget, "matched">[] = [];
    for (const n of row.subcategory_names ?? []) {
      if (n) targets.push({ type: "subcategory", value: String(n), strength: "synonym", source: "search_synonyms.subcategory_names" });
    }
    for (const n of row.service_names ?? []) {
      if (n) targets.push({ type: "service", value: String(n), strength: "synonym", source: "search_synonyms.service_names" });
    }
    if (row.badge_id) {
      targets.push({ type: "badge", value: String(row.badge_id), strength: "synonym", source: "search_synonyms.badge_id" });
    }
    for (const n of row.engagement_filters ?? []) {
      if (n) targets.push({ type: "engagement", value: String(n), strength: "synonym", source: "search_synonyms.engagement_filters" });
    }
    for (const n of row.commodity_filters ?? []) {
      if (n) targets.push({ type: "commodity", value: String(n), strength: "synonym", source: "search_synonyms.commodity_filters" });
    }
    if (!targets.length) continue; // ligne sans mapping : rien à résoudre (37 lignes sur 66 aujourd'hui)
    for (const key of keys) for (const t of targets) push(synonymEntries, key, t as any);
  }

  cachedVocab = {
    entries,
    synonymEntries,
    wordToServices,

    loadedAt: Date.now(),
    counts: {
      subcategories: subcats.length,
      services: services.length,
      synonyms: synonyms.length,
      categories: categories.length,
      literalTerms: entries.size,
      synonymTerms: synonymEntries.size,
    },
  };
  return cachedVocab;
}

const TYPE_PRIORITY: Record<TargetType, number> = {
  subcategory: 0,
  category: 1,
  service: 2,
  badge: 3,
  commodity: 4,
  engagement: 5,
  city: 6,
  neighborhood: 7,
};

const STRENGTH_PRIORITY: Record<MatchStrength, number> = { exact: 0, phrase: 1, word: 2, synonym: 3 };

export interface ResolveResult {
  query: string;
  normalized: string;
  targets: ResolvedTarget[];
  /** Aucune cible : la requête sort du vocabulaire connu. */
  unresolved: boolean;
}

/**
 * Résout un texte libre contre le vocabulaire réel.
 * Aucun appel réseau : le vocabulaire est fourni par loadTaxonomyVocabulary.
 */
export function resolveTaxonomy(query: string, vocab: TaxonomyVocabulary): ResolveResult {
  const normalized = normalizeTerm(query);
  const out: ResolvedTarget[] = [];
  if (!normalized) return { query, normalized, targets: [], unresolved: true };

  const collect = (map: Map<string, ResolvedTarget[]>, forced?: MatchStrength) => {
    for (const [term, targets] of map) {
      if (!containsOnWordBoundary(normalized, term)) continue;
      const strength: MatchStrength =
        forced ?? (term === normalized ? "exact" : term.includes(" ") ? "phrase" : "word");
      for (const t of targets) out.push({ ...t, strength: t.strength === "synonym" ? "synonym" : strength, matched: term });
    }
  };

  collect(vocab.entries);
  collect(vocab.synonymEntries, "synonym");

  // Dédoublonnage type+value en gardant la meilleure force, puis tri :
  // force → priorité de type → longueur du terme matché (le plus spécifique d'abord).
  const best = new Map<string, ResolvedTarget>();
  for (const t of out) {
    const key = `${t.type}::${t.value}`;
    const prev = best.get(key);
    if (!prev || STRENGTH_PRIORITY[t.strength] < STRENGTH_PRIORITY[prev.strength] || t.matched.length > prev.matched.length) {
      if (!prev || STRENGTH_PRIORITY[t.strength] <= STRENGTH_PRIORITY[prev.strength]) best.set(key, t);
    }
  }

  const targets = [...best.values()].sort((a, b) => {
    const s = STRENGTH_PRIORITY[a.strength] - STRENGTH_PRIORITY[b.strength];
    if (s !== 0) return s;
    const p = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (p !== 0) return p;
    return b.matched.length - a.matched.length;
  });

  return { query, normalized, targets, unresolved: targets.length === 0 };
}

/** Raccourci : charge le vocabulaire puis résout. */
export async function resolveWithAdmin(admin: any, query: string): Promise<ResolveResult> {
  const vocab = await loadTaxonomyVocabulary(admin);
  return resolveTaxonomy(query, vocab);
}

/** Filtre par type, dans l'ordre de pertinence déjà calculé. */
export function targetsOfType(result: ResolveResult, type: TargetType): string[] {
  return result.targets.filter((t) => t.type === type).map((t) => t.value);
}

/** Payload compact pour les métriques de résolution (search_logs / ai_conversation_turns). */
export function resolutionMetric(result: ResolveResult) {
  const byType: Record<string, string[]> = {};
  for (const t of result.targets) (byType[t.type] ??= []).push(t.value);
  const types = Object.keys(byType);
  return {
    resolved_targets: result.targets.slice(0, 20).map((t) => ({ type: t.type, value: t.value, strength: t.strength, matched: t.matched })),
    resolved_types: types,
    resolution_unresolved: result.unresolved,
    /** Vrai quand seuls des services répondent : c'est le trou silencieux mesuré à 19,8 %. */
    resolution_service_only: types.length > 0 && types.every((t) => t === "service"),
  };
}
