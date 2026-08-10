import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  loadTaxonomyVocabulary,
  resolveTaxonomy,
  normalizeTerm,
  containsOnWordBoundary,
  targetsOfType,
  resolutionMetric,
} from "./taxonomy-resolver.ts";

// Fixtures reproduisant la donnée réelle mesurée en base le 10/08/2026.
const FIXTURES: Record<string, any[]> = {
  subcategories: [
    { name_fr: "Piscine", name_en: "Swimming pool", name_ar: null, keywords: ["aller à la piscine", "swimming pool", "nager", "piquer une tête", "centre aquatique", "aquapark"] },
    { name_fr: "Aquaparc", name_en: null, name_ar: null, keywords: ["centre aquatique", "piscine", "parc aquatique"] },
    { name_fr: "Beach club", name_en: null, name_ar: null, keywords: ["piscine", "pool"] },
    { name_fr: "Deux-roues", name_en: null, name_ar: null, keywords: ["vtt", "ebike", "e-bike", "vélo", "bicyclette"] },
    { name_fr: "Restaurant", name_en: "Restaurant", name_ar: null, keywords: ["restauration"] },
  ],
  services: [
    { name_fr: "Piscine", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Piscine chauffée", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Lunettes de piscine", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Quad", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Excursions en quad", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Vélos électriques", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Balades en vélo électrique", name_en: null, name_ar: null, keywords: [] },
    { name_fr: "Langouste", name_en: "Lobster", name_ar: null, keywords: [] },
  ],
  search_synonyms: [
    { key_word: "piscine", synonyms: ["pool", "baignade"], subcategory_names: [], service_names: [], badge_id: null, engagement_filters: [], commodity_filters: [] },
    { key_word: "location quad", synonyms: ["louer un quad"], subcategory_names: [], service_names: ["Quad", "Excursions en quad"], badge_id: null, engagement_filters: [], commodity_filters: [] },
  ],
  categories: [{ name_fr: "Restauration", name_en: "Food & drink", name_ar: null }],
  cities: [{ name: "Marrakech" }, { name: "Essaouira" }],
  neighborhoods: [{ name: "Guéliz" }, { name: "Sidi Ghanem" }],
};

function fakeAdmin() {
  return {
    from(table: string) {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        range: (from: number) => Promise.resolve({ data: from === 0 ? (FIXTURES[table] ?? []) : [], error: null }),
      };
      return builder;
    },
  };
}

const vocab = await loadTaxonomyVocabulary(fakeAdmin(), true);

Deno.test("normalizeTerm: accents, apostrophes, ponctuation", () => {
  assertEquals(normalizeTerm("Vélo électrique !"), "velo electrique");
  assertEquals(normalizeTerm("Deux-roues"), "deux roues");
});

Deno.test("containsOnWordBoundary: pas de match partiel de mot", () => {
  assertEquals(containsOnWordBoundary("piscine chauffee", "piscine"), true);
  assertEquals(containsOnWordBoundary("piscines multiples", "piscine"), false);
});

Deno.test("piscine à proximité → service + sous-catégorie Piscine", () => {
  const r = resolveTaxonomy("piscine à proximité", vocab);
  assertEquals(r.unresolved, false);
  assertEquals(targetsOfType(r, "subcategory").includes("Piscine"), true);
  assertEquals(targetsOfType(r, "service").includes("Piscine"), true);
});

Deno.test("'Lunettes de piscine' n'est jamais une cible forte (expansion par mot = ranking seulement)", () => {
  const r = resolveTaxonomy("piscine à proximité", vocab);
  assertEquals(strongTargetsOfType(r, "service").includes("Lunettes de piscine"), false);
  assertEquals(strongTargetsOfType(r, "service").includes("Piscine"), true);
});


Deno.test("quad marrakech → services Quad + ville (0 résultat en prod avant le résolveur)", () => {
  const r = resolveTaxonomy("quad marrakech", vocab);
  const services = targetsOfType(r, "service");
  assertEquals(services.includes("Quad"), true);
  assertEquals(services.includes("Excursions en quad"), true);
  assertEquals(targetsOfType(r, "city"), ["Marrakech"]);
});

Deno.test("vélo électrique → services vélo électrique + sous-catégorie Deux-roues", () => {
  const r = resolveTaxonomy("vélo électrique", vocab);
  assertEquals(targetsOfType(r, "service").includes("Vélos électriques"), true);
  assertEquals(targetsOfType(r, "subcategory").includes("Deux-roues"), true);
});

Deno.test("langouste essaouira → service Langouste + ville", () => {
  const r = resolveTaxonomy("langouste essaouira", vocab);
  assertEquals(targetsOfType(r, "service"), ["Langouste"]);
  assertEquals(targetsOfType(r, "city"), ["Essaouira"]);
});

Deno.test("restauration → catégorie et sous-catégorie via keyword", () => {
  const r = resolveTaxonomy("restauration", vocab);
  assertEquals(targetsOfType(r, "category").includes("Restauration"), true);
  assertEquals(targetsOfType(r, "subcategory").includes("Restaurant"), true);
});

Deno.test("synonyme mappé: 'louer un quad' résout via search_synonyms.service_names", () => {
  const r = resolveTaxonomy("louer un quad à marrakech", vocab);
  assertEquals(targetsOfType(r, "service").includes("Quad"), true);
});

Deno.test("terme hors vocabulaire → unresolved", () => {
  const r = resolveTaxonomy("guerre verticale propagande", vocab);
  assertEquals(r.unresolved, true);
  assertEquals(r.targets.length, 0);
});

Deno.test("l'exact prime sur le keyword dans l'ordre des cibles", () => {
  const r = resolveTaxonomy("piscine", vocab);
  assertEquals(r.targets[0].strength, "exact");
});

Deno.test("resolutionMetric: détecte le cas service-only", () => {
  const m = resolutionMetric(resolveTaxonomy("langouste", vocab));
  assertEquals(m.resolution_service_only, true);
  assertEquals(m.resolution_unresolved, false);
  const m2 = resolutionMetric(resolveTaxonomy("piscine", vocab));
  assertEquals(m2.resolution_service_only, false);
});
