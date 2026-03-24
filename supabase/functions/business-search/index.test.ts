import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  tagsMatchCandidate,
  tokenizeForMatching,
  normalizeMatchingText,
  isNaturalLanguageQuery,
  detectSuperlative,
  stripAccentsGlobal,
} from "./search-helpers.ts";

// ═══════════════════════════════════════════════════
// tagsMatchCandidate — Tests de régression
// ═══════════════════════════════════════════════════

Deno.test("tagsMatchCandidate: exact match", () => {
  assertEquals(tagsMatchCandidate("Maillots de bain", ["Maillots de bain"]), true);
});

Deno.test("tagsMatchCandidate: 'Maillots de bain' should NOT match 'Sels de bain'", () => {
  assertEquals(tagsMatchCandidate("Maillots de bain", ["Sels de bain"]), false);
});

Deno.test("tagsMatchCandidate: 'Maillots de bain' should NOT match 'Bain aux huiles essentielles'", () => {
  assertEquals(
    tagsMatchCandidate("Maillots de bain", ["Bain aux huiles essentielles & sels minéraux"]),
    false
  );
});

Deno.test("tagsMatchCandidate: 'Maillots de bain' should NOT match unrelated beauty tags", () => {
  const natusTags = [
    "Huile d'argane", "Beauté", "Beurre de Karité", "Sels de bain",
    "Gommage", "Parfumerie", "Savon noir", "Crème hydratante",
  ];
  assertEquals(tagsMatchCandidate("Maillots de bain", natusTags), false);
});

Deno.test("tagsMatchCandidate: single-word candidate 'Golf' should match 'Golf'", () => {
  assertEquals(tagsMatchCandidate("Golf", ["Golf"]), true);
});

Deno.test("tagsMatchCandidate: 'Golf' should NOT match 'Montgolfière'", () => {
  assertEquals(tagsMatchCandidate("Golf", ["Montgolfière"]), false);
});

Deno.test("tagsMatchCandidate: 'Golf' should match tag containing 'Club de Golf'", () => {
  assertEquals(tagsMatchCandidate("Golf", ["Club de Golf"]), true);
});

Deno.test("tagsMatchCandidate: 'Huile d\\'argan' exact match", () => {
  assertEquals(tagsMatchCandidate("Huile d'argan", ["Huile d'argan"]), true);
});

Deno.test("tagsMatchCandidate: 'Yoga' should match 'Yoga'", () => {
  assertEquals(tagsMatchCandidate("Yoga", ["Yoga"]), true);
});

Deno.test("tagsMatchCandidate: 'Yoga' should NOT match 'Massage'", () => {
  assertEquals(tagsMatchCandidate("Yoga", ["Massage"]), false);
});

Deno.test("tagsMatchCandidate: 'Tapis' should match 'Tapis berbère'", () => {
  assertEquals(tagsMatchCandidate("Tapis", ["Tapis berbère"]), true);
});

Deno.test("tagsMatchCandidate: 'Au feu de bois' should match exact", () => {
  assertEquals(tagsMatchCandidate("Au feu de bois", ["Au feu de bois"]), true);
});

Deno.test("tagsMatchCandidate: 'Au feu de bois' vs 'Bois de chauffage' — correctly rejects", () => {
  // Fixed: distinct word counting now correctly requires 2 content words to match.
  // "Au feu de bois" has content words ["feu", "bois"], "Bois de chauffage" only shares "bois" → 1 match < 2 required.
  assertEquals(tagsMatchCandidate("Au feu de bois", ["Bois de chauffage"]), false);
});

Deno.test("tagsMatchCandidate: 'cour' should match 'Cours de piano' (singular/plural variant)", () => {
  assertEquals(tagsMatchCandidate("Cours de piano", ["Cours de piano"]), true);
});

// ═══════════════════════════════════════════════════
// tokenizeForMatching
// ═══════════════════════════════════════════════════

Deno.test("tokenizeForMatching: expands plurals", () => {
  const tokens = tokenizeForMatching("Maillots de bain");
  assertEquals(tokens.includes("maillots"), true);
  assertEquals(tokens.includes("maillot"), true);
  assertEquals(tokens.includes("bain"), true);
});

Deno.test("tokenizeForMatching: strips accents", () => {
  const tokens = tokenizeForMatching("Montgolfière");
  assertEquals(tokens.includes("montgolfiere"), true);
});

// ═══════════════════════════════════════════════════
// normalizeMatchingText
// ═══════════════════════════════════════════════════

Deno.test("normalizeMatchingText: lowercases and strips accents", () => {
  assertEquals(normalizeMatchingText("Hôtellerie"), "hotellerie");
});

Deno.test("normalizeMatchingText: replaces special chars with spaces", () => {
  assertEquals(normalizeMatchingText("Spa / Hammam"), "spa hammam");
});

// ═══════════════════════════════════════════════════
// isNaturalLanguageQuery
// ═══════════════════════════════════════════════════

Deno.test("isNaturalLanguageQuery: short query → false", () => {
  assertEquals(isNaturalLanguageQuery("golf marrakech"), false);
});

Deno.test("isNaturalLanguageQuery: natural sentence → true", () => {
  assertEquals(isNaturalLanguageQuery("je veux acheter un maillot de bain"), true);
});

Deno.test("isNaturalLanguageQuery: keyword-style → false", () => {
  assertEquals(isNaturalLanguageQuery("restaurant italien marrakech"), false);
});

// ═══════════════════════════════════════════════════
// detectSuperlative
// ═══════════════════════════════════════════════════

Deno.test("detectSuperlative: 'meilleur restaurant' → true", () => {
  assertEquals(detectSuperlative("meilleur restaurant"), true);
});

Deno.test("detectSuperlative: 'restaurant marrakech' → false", () => {
  assertEquals(detectSuperlative("restaurant marrakech"), false);
});

Deno.test("detectSuperlative: 'top hotel' → true", () => {
  assertEquals(detectSuperlative("top hotel"), true);
});

// ═══════════════════════════════════════════════════
// stripAccentsGlobal
// ═══════════════════════════════════════════════════

Deno.test("stripAccentsGlobal: removes French accents", () => {
  assertEquals(stripAccentsGlobal("Hôtellerie"), "Hotellerie");
  assertEquals(stripAccentsGlobal("Éducation"), "Education");
  assertEquals(stripAccentsGlobal("Bien-être"), "Bien-etre");
  assertEquals(stripAccentsGlobal("montgolfière"), "montgolfiere");
});

// ═══════════════════════════════════════════════════
// Word-boundary keyword matching regression
// ═══════════════════════════════════════════════════

Deno.test("tagsMatchCandidate: 'Vélo' should NOT match 'velours'", () => {
  assertEquals(tagsMatchCandidate("Vélo", ["velours"]), false);
});

Deno.test("tagsMatchCandidate: 'Vélo' should match 'Vélo électrique'", () => {
  assertEquals(tagsMatchCandidate("Vélo", ["Vélo électrique"]), true);
});

Deno.test("tagsMatchCandidate: 'velo' should NOT match 'velours'", () => {
  assertEquals(tagsMatchCandidate("velo", ["velours"]), false);
});
