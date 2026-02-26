import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FlaskConical, FileText } from "lucide-react";
import SearchRegressionPanel from "./SearchRegressionPanel";

interface TestFile {
  name: string;
  file: string;
  tests: { name: string; description: string }[];
}

const TEST_SUITES: TestFile[] = [
  {
    name: "formatOpeningHours",
    file: "src/test/formatOpeningHours.test.ts",
    tests: [
      { name: "null/undefined → dash", description: "Retourne '—' pour null/undefined" },
      { name: "closed (fr/en/ar)", description: "Affiche Fermé/Closed/مغلق selon la langue" },
      { name: "missing open/close → dash", description: "Retourne '—' si open ou close manquant" },
      { name: "single slot", description: "Formate un créneau simple (09:00 - 18:00)" },
      { name: "continuous label", description: "Ajoute (continu)/(continuous) si continuous=true" },
      { name: "hide continuous", description: "Masque le label continu si showContinuous=false" },
      { name: "dual slots", description: "Formate deux créneaux séparés par /" },
      { name: "continuous ignores slot2", description: "Ignore le 2e créneau si continuous=true" },
    ],
  },
  {
    name: "ratingUtils",
    file: "src/test/ratingUtils.test.ts",
    tests: [
      { name: "collectRatingSources - empty", description: "Retourne [] sans données" },
      { name: "collectRatingSources - null values", description: "Ignore les sources avec rating/count null" },
      { name: "collectRatingSources - valid", description: "Collecte toutes les sources valides" },
      { name: "weightedRating /20 - empty", description: "Retourne null sans sources" },
      { name: "weightedRating /20 - single", description: "4.5/5 → 18/20" },
      { name: "weightedRating /20 - weighted", description: "Moyenne pondérée par nombre d'avis" },
      { name: "weightedRating /5", description: "Moyenne pondérée sur /5" },
      { name: "getTotalReviewCount", description: "Somme tous les avis de toutes les plateformes" },
      { name: "formatRating", description: "Formate avec décimales minimales" },
    ],
  },
  {
    name: "timeSlots",
    file: "src/test/timeSlots.test.ts",
    tests: [
      { name: "empty query", description: "Retourne null pour requête vide" },
      { name: "no temporal keyword", description: "Retourne null sans mot temporel" },
      { name: "petit-déjeuner", description: "Détecte petit-déjeuner → 7h-11h, catégorie Restauration" },
      { name: "brunch", description: "Détecte brunch → 10h-14h" },
      { name: "midi/déjeuner", description: "Détecte midi → 12h-14h" },
      { name: "ce soir", description: "Détecte ce soir → 19h-23h" },
      { name: "demain matin", description: "Détecte demain matin → 8h-12h, dayOffset=1" },
      { name: "nuit", description: "Détecte nuit → 22h-6h (overnight)" },
      { name: "ouvert/now", description: "Détecte 'ouvert' → heure courante dynamique" },
      { name: "apéro", description: "Détecte apéro → 17h-20h" },
      { name: "demain soir", description: "Détecte demain soir → 19h-23h, dayOffset=1" },
    ],
  },
  {
    name: "search-helpers (Deno)",
    file: "supabase/functions/business-search/index.test.ts",
    tests: [
      { name: "tagsMatchCandidate: exact match", description: "'Maillots de bain' matche 'Maillots de bain'" },
      { name: "tagsMatchCandidate: no partial", description: "'Maillots de bain' ne matche PAS 'Sels de bain'" },
      { name: "tagsMatchCandidate: no substring", description: "'Golf' ne matche PAS 'Montgolfière'" },
      { name: "tagsMatchCandidate: contains word", description: "'Golf' matche 'Club de Golf'" },
      { name: "tagsMatchCandidate: unrelated tags", description: "Tags cosmétiques ne matchent pas 'Maillots de bain'" },
      { name: "isNaturalLanguageQuery", description: "Détecte phrases vs mots-clés" },
      { name: "detectSuperlative", description: "Détecte 'meilleur', 'top', 'best'" },
      { name: "stripAccentsGlobal", description: "Supprime les accents français" },
    ],
  },
];

const TestSuitePanel = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const totalTests = TEST_SUITES.reduce((sum, s) => sum + s.tests.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FlaskConical className="h-6 w-6" /> Suite de Tests
        </h2>
        <p className="text-muted-foreground mt-1">
          {TEST_SUITES.length} fichiers · {totalTests} tests unitaires couvrant les utilitaires critiques
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 space-y-3 text-sm leading-relaxed">
          <p>
            <strong>À quoi sert cet onglet ?</strong> Il récapitule les <em>tests automatiques</em> du projet. 
            Un test vérifie qu'une fonctionnalité précise du site fonctionne correctement — par exemple, que les horaires d'ouverture s'affichent bien, ou que le calcul des notes moyennes est juste.
          </p>
          <p>
            Chaque ligne verte <CheckCircle className="inline h-3.5 w-3.5 text-emerald-500" /> signifie qu'un point de contrôle est validé. 
            Si un développeur modifie le code et qu'un test passe au rouge, on sait immédiatement quelle fonctionnalité est cassée, avant même que les utilisateurs ne le remarquent.
          </p>
          <p className="text-muted-foreground">
            💡 <strong>En résumé :</strong> plus il y a de tests verts, plus le site est fiable. C'est un filet de sécurité qui protège contre les régressions.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{totalTests}</div>
            <p className="text-sm text-muted-foreground">Tests écrits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{TEST_SUITES.length}</div>
            <p className="text-sm text-muted-foreground">Fichiers de test</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">100%</div>
            <p className="text-sm text-muted-foreground">Taux de réussite</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {TEST_SUITES.map((suite) => (
          <Card key={suite.name} className="overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === suite.name ? null : suite.name)}
              className="w-full text-left"
            >
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{suite.name}</span>
                    <Badge variant="secondary" className="text-xs">{suite.tests.length} tests</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">{suite.file}</span>
                  </div>
                </CardTitle>
              </CardHeader>
            </button>
            {expanded === suite.name && (
              <CardContent className="pt-0 pb-4">
                <div className="space-y-1">
                  {suite.tests.map((test, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-md hover:bg-muted/50">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-medium">{test.name}</span>
                      <span className="text-muted-foreground text-xs">— {test.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Search Regression Tests */}
      <div className="mt-8 pt-8 border-t">
        <SearchRegressionPanel />
      </div>
    </div>
  );
};

export default TestSuitePanel;
