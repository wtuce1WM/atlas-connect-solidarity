import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou anti-double-autorité.
 *
 * Aucun fichier migré ne doit contenir de littéral de style :
 * hex, rgba(), textShadow, boxShadow, ou spring({config}) local.
 * Seul `src/tokens/` porte ces valeurs.
 *
 * Ajouter un fichier à MIGRATED dès qu'il est migré. La liste ne rétrécit jamais.
 */
const MIGRATED = [
  "src/theme.ts",
  "src/MainVideo.tsx",
  "src/scenes/SceneOpen.tsx",
  "src/scenes/SceneKoutoubia.tsx",
  "src/scenes/SceneTriptych.tsx",
  "src/scenes/SceneAgent.tsx",
  "src/scenes/SceneClose.tsx",
  "src/CorporateVertical.tsx",
  "src/AgentIaDemo.tsx",
  "src/BusinessShowcase.tsx",
];

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: "couleur hex en dur", re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "rgba()/rgb() en dur", re: /\brgba?\(/ },
  // Les ombres sont autorisées uniquement via un token (`elevation.*`),
  // jamais via une valeur littérale.
  { name: "textShadow littéral", re: /textShadow\s*:\s*["'`]/ },
  { name: "boxShadow littéral", re: /boxShadow\s*:\s*["'`]/ },
  { name: "config de spring local", re: /config\s*:\s*\{/ },
];

const root = join(import.meta.dir, "..", "..");

describe("tokens: aucune autorité de style concurrente", () => {
  for (const file of MIGRATED) {
    it(file, () => {
      const src = readFileSync(join(root, file), "utf8");
      const hits = FORBIDDEN.filter((f) => f.re.test(src)).map((f) => f.name);
      expect(hits).toEqual([]);
    });
  }
});
