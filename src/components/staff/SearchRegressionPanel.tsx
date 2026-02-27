import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Search, Play, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchTestCase {
  id: string;
  query: string;
  description: string;
  /** Business names that MUST appear in results */
  mustInclude?: string[];
  /** Business names that must NOT appear in results */
  mustExclude?: string[];
  /** Expected minimum result count */
  minResults?: number;
  /** Expected maximum result count */
  maxResults?: number;
  /** Category filter to apply */
  category?: string;
}

interface TestResult {
  id: string;
  passed: boolean;
  details: string;
  businessNames: string[];
  duration: number;
}

const SEARCH_TEST_CASES: SearchTestCase[] = [
  {
    id: "golf-no-montgolfiere",
    query: "golf",
    description: "\"golf\" ne doit pas retourner Montgolfière",
    mustExclude: ["Maroc Montgolfière"],
    minResults: 1,
  },
  {
    id: "maillot-bain-only-sport",
    query: "maillots de bain",
    description: "\"maillots de bain\" ne doit retourner que des magasins de sport (pas cosmétiques)",
    mustExclude: ["Natus Marrakech Medina Mall", "Natus Marrakech Gueliz", "Natus Marrakech Laboratoire", "Les Bains de Marrakech", "Les Bains d'Azahara"],
    mustInclude: ["Decathlon Marrakech Menara"],
    minResults: 1,
  },
  {
    id: "maillot-bain-voice",
    query: "maillot bain",
    description: "\"maillot bain\" (version voice) — mêmes exclusions que maillots de bain",
    mustExclude: ["Natus Marrakech Medina Mall", "Natus Marrakech Gueliz"],
  },
  {
    id: "restaurant-marrakech",
    query: "restaurant marrakech",
    description: "\"restaurant marrakech\" doit retourner des résultats",
    minResults: 3,
  },
  {
    id: "hotel-essaouira",
    query: "hotel essaouira",
    description: "\"hotel essaouira\" doit retourner des hôtels à Essaouira",
    minResults: 1,
  },
  {
    id: "yoga",
    query: "yoga",
    description: "\"yoga\" doit retourner des établissements avec le service Yoga",
    minResults: 1,
  },
  {
    id: "yoga-marrakech-zone",
    query: "yoga marrakech",
    description: "\"yoga marrakech\" doit inclure Clubs.ma (zone nationale)",
    mustInclude: ["Clubs.ma"],
    minResults: 1,
  },
  {
    id: "meilleur-restaurant",
    query: "meilleur restaurant marrakech",
    description: "\"meilleur restaurant\" doit fonctionner (superlatif)",
    minResults: 1,
  },
  {
    id: "tapis-berbere",
    query: "tapis",
    description: "\"tapis\" doit retourner des magasins d'artisanat/tapis",
    minResults: 1,
  },
  {
    id: "sels-de-bain",
    query: "sels de bain",
    description: "\"sels de bain\" doit retourner des cosmétiques (Natus etc.)",
    minResults: 1,
  },
  {
    id: "alcool-gueliz-no-restaurants",
    query: "je veux acheter de l'alcool à Guéliz",
    description: "\"acheter alcool Guéliz\" ne doit pas retourner de restaurants ni La Maison de Bacchus",
    mustExclude: ["La Maison de Bacchus"],
    minResults: 1,
  },
];

const SearchRegressionPanel = () => {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const runSingleTest = useCallback(async (testCase: SearchTestCase): Promise<TestResult> => {
    const start = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: {
          query: testCase.query,
          category: testCase.category,
          language: "fr",
        },
      });

      if (error) throw error;

      const businesses: { name: string }[] = data?.businesses || [];
      const businessNames = businesses.map((b) => b.name);
      const duration = Math.round(performance.now() - start);
      const failures: string[] = [];

      // Check mustInclude
      if (testCase.mustInclude) {
        for (const name of testCase.mustInclude) {
          if (!businessNames.some((bn) => bn.includes(name))) {
            failures.push(`Manquant: "${name}"`);
          }
        }
      }

      // Check mustExclude
      if (testCase.mustExclude) {
        for (const name of testCase.mustExclude) {
          if (businessNames.some((bn) => bn.includes(name))) {
            failures.push(`Présent mais interdit: "${name}"`);
          }
        }
      }

      // Check minResults
      if (testCase.minResults !== undefined && businessNames.length < testCase.minResults) {
        failures.push(`${businessNames.length} résultats < minimum ${testCase.minResults}`);
      }

      // Check maxResults
      if (testCase.maxResults !== undefined && businessNames.length > testCase.maxResults) {
        failures.push(`${businessNames.length} résultats > maximum ${testCase.maxResults}`);
      }

      return {
        id: testCase.id,
        passed: failures.length === 0,
        details: failures.length === 0
          ? `✅ ${businessNames.length} résultat(s) — OK`
          : failures.join(" · "),
        businessNames,
        duration,
      };
    } catch (err: any) {
      return {
        id: testCase.id,
        passed: false,
        details: `Erreur: ${err.message}`,
        businessNames: [],
        duration: Math.round(performance.now() - start),
      };
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults({});
    for (const tc of SEARCH_TEST_CASES) {
      setRunningId(tc.id);
      const result = await runSingleTest(tc);
      setResults((prev) => ({ ...prev, [tc.id]: result }));
    }
    setRunningId(null);
    setIsRunning(false);
  }, [runSingleTest]);

  const runOneTest = useCallback(async (tc: SearchTestCase) => {
    setRunningId(tc.id);
    const result = await runSingleTest(tc);
    setResults((prev) => ({ ...prev, [tc.id]: result }));
    setRunningId(null);
  }, [runSingleTest]);

  const passedCount = Object.values(results).filter((r) => r.passed).length;
  const failedCount = Object.values(results).filter((r) => !r.passed).length;
  const totalRun = Object.keys(results).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Search className="h-5 w-5" /> Tests de Régression — Recherche
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {SEARCH_TEST_CASES.length} cas de test vérifiant le moteur de recherche en conditions réelles
          </p>
        </div>
        <Button onClick={runAllTests} disabled={isRunning} className="gap-2">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isRunning ? "En cours..." : "Lancer tous les tests"}
        </Button>
      </div>

      {totalRun > 0 && (
        <div className="flex gap-4">
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
            <CheckCircle className="h-3 w-3" /> {passedCount} passé(s)
          </Badge>
          {failedCount > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1">
              <XCircle className="h-3 w-3" /> {failedCount} échoué(s)
            </Badge>
          )}
        </div>
      )}

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4 text-sm space-y-2">
          <p className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span>
              Ces tests appellent le moteur de recherche en production. Chaque test vérifie que des établissements 
              spécifiques apparaissent (ou n'apparaissent pas) pour une requête donnée. Si un test échoue après une 
              modification du moteur, c'est un signal de régression.
            </span>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {SEARCH_TEST_CASES.map((tc) => {
          const result = results[tc.id];
          const isCurrentlyRunning = runningId === tc.id;

          return (
            <Card
              key={tc.id}
              className={`overflow-hidden transition-colors ${
                result
                  ? result.passed
                    ? "border-emerald-200"
                    : "border-red-200 bg-red-50/30"
                  : ""
              }`}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isCurrentlyRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    ) : result ? (
                      result.passed ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {tc.query}
                        </code>
                        <span className="text-sm text-muted-foreground truncate">
                          {tc.description}
                        </span>
                      </div>
                      {result && (
                        <p className={`text-xs mt-1 ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
                          {result.details}
                          <span className="text-muted-foreground ml-2">({result.duration}ms)</span>
                        </p>
                      )}
                      {result && !result.passed && result.businessNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Résultats: {result.businessNames.slice(0, 8).join(", ")}
                          {result.businessNames.length > 8 && ` +${result.businessNames.length - 8}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runOneTest(tc)}
                    disabled={isRunning}
                    className="shrink-0"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SearchRegressionPanel;
