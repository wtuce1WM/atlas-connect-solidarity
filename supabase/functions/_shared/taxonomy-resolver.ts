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
export type MatchStrength = "exact" | "phrase" | "word" | "synonym" | "expansion";

export interface ResolvedTarget {
  type: TargetType;
  /** Valeur canonique en base (name_fr, ou id pour un badge). */
  value: string;
  strength: MatchStrength;
  /** Colonne d'origine, pour le debug et les métriques. */
  source: string;
  /** Portion de la requête qui a déclenché la correspondance. */
  matched: string;
  /**
   * Catégories racines auxquelles la cible appartient réellement en base
   * (services.subcategory_id → subcategories.category_id → categories.name_fr).
   * C'est ce qui distingue « Cuisine italienne » (Restauration) de « Parmesan »
   * (Commerce) sans ajouter la moindre colonne.
   */
  categories?: string[];
  /** Sous-catégories réelles de la cible (services.subcategory_id → subcategories.name_fr). */
  subcategories?: string[];

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
  /** Libellé de service normalisé → catégories racines qui le portent. */
  serviceCategories: Map<string, Set<string>>;
  /** Libellé de service normalisé → sous-catégories qui le portent. */
  serviceSubcategories: Map<string, Set<string>>;
  /** Nom de sous-catégorie normalisé → catégories racines. */
  subcategoryCategories: Map<string, Set<string>>;
  /**
   * Index stemmé : terme dont chaque mot est passé par `stemKey` → cibles.
   * Sans lui, « restaurants français » ne rencontrait jamais la sous-catégorie
   * `Restaurant` (frontière de mot bloquée par le pluriel), le moteur perdait le type
   * de lieu et partait en repli sémantique bruyant.
   */
  stemEntries: Map<string, ResolvedTarget[]>;

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
  // Mots de conversation : ils apparaissent dans des libellés de services
  // (« Restauration sur place », « Place publique ») mais ne portent aucune
  // intention de recherche. Sans ça « Que faire sur place ? » déclenchait une
  // recherche restauration.
  "place", "places", "faire", "chose", "choses", "endroit", "endroits", "truc", "trucs",
  "there", "place", "thing", "things",
]);


/**
 * Clé de rapprochement : pluriel ET genre rabattus sur une forme unique.
 * Appliquée symétriquement à l'index et à la requête, donc seule la cohérence compte.
 * « français » / « française » / « françaises » → une seule clé, sinon « restaurants
 * français » n'atteignait jamais le service « Cuisine française ».
 */
export function stemKey(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("s")) w = w.slice(0, -1);
  // Adjectifs de nationalité : ienne→ien, aise→ais, aine→ain, puis -e final.
  if (w.length > 5 && w.endsWith("ienne")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}


/** Mots significatifs d'un libellé. */
export function contentWords(text: string): string[] {
  return normalizeTerm(text)
    .split(" ")
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
}

/** Terme entier rabattu mot à mot par `stemKey` (pluriel + genre neutralisés). */
export function stemPhrase(text: string): string {
  return normalizeTerm(text)
    .split(" ")
    .filter(Boolean)
    .map(stemKey)
    .join(" ");
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
    selectAll(admin, "subcategories", "id, category_id, name_fr, name_en, name_ar, keywords"),
    selectAll(admin, "services", "subcategory_id, name_fr, name_en, name_ar, keywords", (q) => q.eq("is_active", true)),
    selectAll(
      admin,
      "search_synonyms",
      "key_word, key_word_en, key_word_ar, synonyms, synonyms_en, synonyms_ar, subcategory_names, service_names, badge_id, engagement_filters, commodity_filters",
      (q) => q.eq("is_active", true),
    ),
    selectAll(admin, "categories", "id, name_fr, name_en, name_ar"),
    selectAll(admin, "cities", "name_fr, name_en, name_ar"),
    selectAll(admin, "neighborhoods", "name, name_en, name_ar"),
  ]);

  const entries = new Map<string, ResolvedTarget[]>();
  const synonymEntries = new Map<string, ResolvedTarget[]>();
  const wordToServices = new Map<string, Set<string>>();
  const serviceCategories = new Map<string, Set<string>>();
  const serviceSubcategories = new Map<string, Set<string>>();
  const subcategoryCategories = new Map<string, Set<string>>();
  const subcatNameById = new Map<string, string>();
  for (const sc of subcats) if (sc.id && sc.name_fr) subcatNameById.set(String(sc.id), String(sc.name_fr));


  // Chaîne de typage native : service → sous-catégorie → catégorie.
  const categoryNameById = new Map<string, string>();
  for (const c of categories) if (c.id && c.name_fr) categoryNameById.set(String(c.id), String(c.name_fr));
  const subcatCategoryById = new Map<string, string>();
  for (const sc of subcats) {
    if (!sc.id) continue;
    const catName = sc.category_id ? categoryNameById.get(String(sc.category_id)) : undefined;
    if (!catName) continue;
    subcatCategoryById.set(String(sc.id), catName);
    const key = normalizeTerm(sc.name_fr);
    if (!key) continue;
    const set = subcategoryCategories.get(key) ?? new Set<string>();
    set.add(catName);
    subcategoryCategories.set(key, set);
  }

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
    // Typage du libellé par la catégorie racine. Un même libellé peut exister sous
    // plusieurs sous-catégories (« Safran » : Épicerie, Coopérative agricole, Culture) :
    // on accumule toutes ses catégories.
    const catName = sv.subcategory_id ? subcatCategoryById.get(String(sv.subcategory_id)) : undefined;
    const subName = sv.subcategory_id ? subcatNameById.get(String(sv.subcategory_id)) : undefined;
    if (catName) {
      const key = normalizeTerm(value);
      const set = serviceCategories.get(key) ?? new Set<string>();
      set.add(catName);
      serviceCategories.set(key, set);
    }
    if (subName) {
      const key = normalizeTerm(value);
      const set = serviceSubcategories.get(key) ?? new Set<string>();
      set.add(subName);
      serviceSubcategories.set(key, set);
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
  for (const c of cities) {
    const value = c.name_fr;
    if (!value) continue;
    for (const name of [c.name_fr, c.name_en, c.name_ar]) {
      if (name) push(entries, name, { type: "city", value, source: "cities.name" });
    }
  }
  for (const n of neighborhoods) {
    const value = n.name;
    if (!value) continue;
    for (const name of [n.name, n.name_en, n.name_ar]) {
      if (name) push(entries, name, { type: "neighborhood", value, source: "neighborhoods.name" });
    }
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

  // Index stemmé, dérivé des entrées littérales. Une clé stemmée identique à la clé
  // normalisée n'apporte rien (elle est déjà couverte) : on ne garde que les formes
  // réellement rabattues, ce qui limite le volume et évite les doublons.
  const stemEntries = new Map<string, ResolvedTarget[]>();
  for (const [term, targets] of entries) {
    const key = stemPhrase(term);
    if (!key || key === term || key.length < 3) continue;
    const list = stemEntries.get(key) ?? [];
    for (const t of targets) {
      if (list.some((x) => x.type === t.type && x.value === t.value)) continue;
      list.push({ ...t, matched: key });
    }
    stemEntries.set(key, list);
  }

  cachedVocab = {
    entries,
    synonymEntries,
    wordToServices,
    serviceCategories,
    serviceSubcategories,
    subcategoryCategories,
    stemEntries,
    loadedAt: Date.now(),
    counts: {
      subcategories: subcats.length,
      services: services.length,
      synonyms: synonyms.length,
      categories: categories.length,
      literalTerms: entries.size,
      synonymTerms: synonymEntries.size,
      typedServices: serviceCategories.size,
      stemTerms: stemEntries.size,
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

const STRENGTH_PRIORITY: Record<MatchStrength, number> = { exact: 0, phrase: 1, word: 2, synonym: 3, expansion: 4 };

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

  const stemmed = stemPhrase(normalized);

  const collect = (map: Map<string, ResolvedTarget[]>, forced?: MatchStrength, hay = normalized) => {
    for (const [term, targets] of map) {
      if (!containsOnWordBoundary(hay, term)) continue;
      const strength: MatchStrength =
        forced ?? (term === hay ? "exact" : term.includes(" ") ? "phrase" : "word");
      for (const t of targets) out.push({ ...t, strength: t.strength === "synonym" ? "synonym" : strength, matched: term });
    }
  };

  collect(vocab.entries);
  collect(vocab.synonymEntries, "synonym");
  // Passe stemmée : « restaurants français » atteint enfin `Restaurant`.
  collect(vocab.stemEntries, undefined, stemmed);


  // Expansion par mot : tout mot significatif de la requête qui apparaît dans un libellé
  // de service remonte ce service. C'est ce qui rattrape « quad marrakech » (Quad,
  // Excursions en quad) et « vélo électrique » (Vélos électriques, Balades en vélo électrique).
  for (const w of contentWords(normalized)) {
    const services = vocab.wordToServices.get(stemKey(w));
    if (!services) continue;
    for (const value of services) {
      out.push({ type: "service", value, strength: "expansion", source: "services.name(word)", matched: w });
    }
  }

  // Dédoublonnage type+value en gardant la meilleure force, puis tri :
  // force → priorité de type → longueur du terme matché (le plus spécifique d'abord).
  const best = new Map<string, ResolvedTarget>();
  for (const t of out) {
    const key = `${t.type}::${t.value}`;
    const prev = best.get(key);
    if (!prev) { best.set(key, t); continue; }
    const better =
      STRENGTH_PRIORITY[t.strength] < STRENGTH_PRIORITY[prev.strength] ||
      (STRENGTH_PRIORITY[t.strength] === STRENGTH_PRIORITY[prev.strength] && t.matched.length > prev.matched.length);
    if (better) best.set(key, t);
  }


  const sorted = [...best.values()].sort((a, b) => {
    const s = STRENGTH_PRIORITY[a.strength] - STRENGTH_PRIORITY[b.strength];
    if (s !== 0) return s;
    const p = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (p !== 0) return p;
    return b.matched.length - a.matched.length;
  });

  // Typage natif : chaque cible porte ses catégories racines et sous-catégories réelles.
  const typed = sorted.map((t) => {
    const key = normalizeTerm(t.value);
    const cats =
      t.type === "service"
        ? vocab.serviceCategories.get(key)
        : t.type === "subcategory"
          ? vocab.subcategoryCategories.get(key)
          : t.type === "category"
            ? new Set([t.value])
            : undefined;
    const subs =
      t.type === "service"
        ? vocab.serviceSubcategories.get(key)
        : t.type === "subcategory"
          ? new Set([t.value])
          : undefined;
    let next = t;
    if (cats?.size) next = { ...next, categories: [...cats] };
    if (subs?.size) next = { ...next, subcategories: [...subs] };
    return next;
  });


  const targets = qualifyByCategory(typed);
  return { query, normalized, targets, unresolved: targets.length === 0 };
}

/**
 * Garde-fou de catégorie — la correction du bug mesuré « supermarchés dans les
 * restaurants italiens ». Le synonyme `italien` mappe six services, dont trois
 * fromages (`Parmesan`, `Gorgonzola`, `Grana Padano`) portés par 15 fiches, toutes
 * `main_category = Commerce`, aucune restaurant. Dès que la requête nomme un type de
 * lieu (« restaurants » → sous-catégorie Restaurant → catégorie Restauration), un
 * service d'une autre catégorie racine ne peut plus être retenu.
 *
 * Aucune donnée ajoutée : la distinction ingrédient / pratique du lieu est déjà portée
 * par services.subcategory_id → subcategories.category_id.
 */
export function qualifyByCategory(targets: ResolvedTarget[]): ResolvedTarget[] {
  const intentCats = new Set<string>();
  for (const t of targets) {
    if (t.strength === "expansion") continue;
    if (t.type !== "subcategory" && t.type !== "category") continue;
    for (const c of t.categories ?? []) intentCats.add(c);
  }
  if (!intentCats.size) return targets;

  return targets.filter((t) => {
    if (t.type !== "service") return true;
    // Service non typé en base : on ne l'écarte pas, on ne sait pas.
    if (!t.categories?.length) return true;
    return t.categories.some((c) => intentCats.has(c));
  });
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

/**
 * Cibles fortes uniquement (exact / phrase / synonyme curé).
 * L'expansion par mot (`word`) est volontairement bruyante — « piscine » remonte aussi
 * « Lunettes de piscine ». Elle sert de facteur de ranking, jamais de filtre.
 * Un appelant qui veut restreindre doit passer par ici.
 */
export function strongTargetsOfType(result: ResolveResult, type: TargetType): string[] {
  return result.targets
    .filter((t) => t.type === type && t.strength !== "expansion")
    .map((t) => t.value);
}

/** Catégories racines d'un libellé de service, telles que déclarées en base. */
export function serviceCategoriesOf(vocab: TaxonomyVocabulary, label: string): string[] {
  return [...(vocab.serviceCategories.get(normalizeTerm(label)) ?? [])];
}

/** Catégories racines d'une sous-catégorie. */
export function subcategoryCategoriesOf(vocab: TaxonomyVocabulary, name: string): string[] {
  return [...(vocab.subcategoryCategories.get(normalizeTerm(name)) ?? [])];
}

/**
 * Applique le garde-fou de catégorie à une liste brute de libellés de services
 * (ex. `search_synonyms.service_names` dans business-search). Un libellé non typé
 * en base est conservé : on ne sait pas, on n'écarte pas.
 */
export function filterServicesByCategories(
  vocab: TaxonomyVocabulary,
  labels: string[],
  intentCategories: string[],
): { kept: string[]; dropped: string[] } {
  const cats = new Set(intentCategories.filter(Boolean));
  if (!cats.size) return { kept: labels, dropped: [] };
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const label of labels) {
    const own = serviceCategoriesOf(vocab, label);
    if (!own.length || own.some((c) => cats.has(c))) kept.push(label);
    else dropped.push(label);
  }
  return { kept, dropped };
}

/** Services retenus par le résolveur qui appartiennent à la catégorie d'intention. */
export function qualifiedServiceTargets(result: ResolveResult): ResolvedTarget[] {
  const intentCats = new Set<string>();
  for (const t of result.targets) {
    if (t.strength === "expansion") continue;
    if (t.type !== "subcategory" && t.type !== "category") continue;
    for (const c of t.categories ?? []) intentCats.add(c);
  }
  if (!intentCats.size) return [];
  return result.targets.filter(
    (t) => t.type === "service" && (t.categories ?? []).some((c) => intentCats.has(c)),
  );
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
