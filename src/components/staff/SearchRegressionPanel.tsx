import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Search, Play, AlertTriangle, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SearchTestCase {
  id: string;
  query: string;
  description: string;
  mustInclude?: string[];
  mustExclude?: string[];
  minResults?: number;
  maxResults?: number;
  category?: string;
}

interface TestResult {
  id: string;
  passed: boolean;
  details: string;
  businessNames: string[];
  duration: number;
}

interface SynonymEntry {
  id: string;
  key_word: string;
  synonyms: string[];
  is_active: boolean;
  filters: { subcategory_name?: string; required_service?: string }[];
  badge_id: string | null;
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
    id: "salade-pissenlit",
    query: "salade de pissenlit",
    description: "\"salade de pissenlit\" ne doit retourner que Le Comptoir Paysan",
    mustInclude: ["Le Comptoir Paysan"],
    maxResults: 3,
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
  const [synonyms, setSynonyms] = useState<SynonymEntry[]>([]);
  const [synonymResults, setSynonymResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("search_synonyms")
        .select("id, key_word, synonyms, is_active, filters, badge_id")
        .eq("is_active", true)
        .order("key_word");
      if (data) {
        setSynonyms(data.map((d: any) => ({
          ...d,
          synonyms: d.synonyms || [],
          filters: Array.isArray(d.filters) ? d.filters : [],
          badge_id: d.badge_id || null,
        })));
      }
    };
    load();
  }, []);

  const runSingleTest = useCallback(async (testCase: SearchTestCase): Promise<TestResult> => {
    const start = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: { query: testCase.query, category: testCase.category, language: "fr" },
      });
      if (error) throw error;

      const businesses: { name: string }[] = data?.businesses || [];
      const businessNames = businesses.map((b) => b.name);
      const duration = Math.round(performance.now() - start);
      const failures: string[] = [];

      if (testCase.mustInclude) {
        for (const name of testCase.mustInclude) {
          if (!businessNames.some((bn) => bn.includes(name))) {
            failures.push(`Manquant: "${name}"`);
          }
        }
      }
      if (testCase.mustExclude) {
        for (const name of testCase.mustExclude) {
          if (businessNames.some((bn) => bn.includes(name))) {
            failures.push(`Présent mais interdit: "${name}"`);
          }
        }
      }
      if (testCase.minResults !== undefined && businessNames.length < testCase.minResults) {
        failures.push(`${businessNames.length} résultats < minimum ${testCase.minResults}`);
      }
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

  const runSynonymTest = useCallback(async (syn: SynonymEntry): Promise<TestResult> => {
    const start = performance.now();
    try {
      // Test the key_word
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: { query: syn.key_word, language: "fr" },
      });
      if (error) throw error;

      const businesses: { name: string; categories?: string[]; services?: string[] }[] = data?.businesses || [];
      const duration = Math.round(performance.now() - start);
      const failures: string[] = [];

      const hasFunctionalConfig = syn.filters.length > 0 || !!syn.badge_id;
      if (hasFunctionalConfig && businesses.length === 0) {
        failures.push("Aucun résultat retourné");
      }

      // Check that results match at least one filter pair
      if (syn.filters.length > 0 && businesses.length > 0) {
        const subcats = [...new Set(syn.filters.map(f => f.subcategory_name).filter(Boolean))];
        const services = [...new Set(syn.filters.map(f => f.required_service).filter(Boolean))];
        
        // Verify at least some results have matching categories/services
        const matchingCount = businesses.filter(biz => {
          const bizCats = biz.categories || [];
          const bizSvcs = biz.services || [];
          return syn.filters.some(f => {
            const subcatOk = !f.subcategory_name || bizCats.includes(f.subcategory_name);
            const svcOk = !f.required_service || bizSvcs.includes(f.required_service);
            return subcatOk && svcOk;
          });
        }).length;

        if (matchingCount === 0) {
          failures.push(`Aucun des ${businesses.length} résultats ne correspond aux filtres (${subcats.join(", ")}${services.length ? " + " + services.join(", ") : ""})`);
        }
      }

      // Also test first synonym if any
      if (syn.synonyms.length > 0) {
        const firstSyn = syn.synonyms[0];
        const { data: synData } = await supabase.functions.invoke("business-search", {
          body: { query: firstSyn, language: "fr" },
        });
        const synBusinesses: { name: string }[] = synData?.businesses || [];
        if (syn.filters.length > 0 && synBusinesses.length === 0) {
          failures.push(`Synonyme "${firstSyn}" → 0 résultat`);
        }
      }

      const businessNames = businesses.map(b => b.name);
      return {
        id: syn.id,
        passed: failures.length === 0,
        details: failures.length === 0
          ? `✅ ${businesses.length} résultat(s) — OK`
          : failures.join(" · "),
        businessNames,
        duration,
      };
    } catch (err: any) {
      return {
        id: syn.id,
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
    setSynonymResults({});
    // Run synonym tests first
    for (const syn of synonyms) {
      setRunningId(`syn-${syn.id}`);
      const result = await runSynonymTest(syn);
      setSynonymResults((prev) => ({ ...prev, [syn.id]: result }));
    }
    // Run static tests
    for (const tc of SEARCH_TEST_CASES) {
      setRunningId(tc.id);
      const result = await runSingleTest(tc);
      setResults((prev) => ({ ...prev, [tc.id]: result }));
    }
    setRunningId(null);
    setIsRunning(false);
  }, [runSingleTest, runSynonymTest, synonyms]);

  const runOneTest = useCallback(async (tc: SearchTestCase) => {
    setRunningId(tc.id);
    const result = await runSingleTest(tc);
    setResults((prev) => ({ ...prev, [tc.id]: result }));
    setRunningId(null);
  }, [runSingleTest]);

  const runOneSynonymTest = useCallback(async (syn: SynonymEntry) => {
    setRunningId(`syn-${syn.id}`);
    const result = await runSynonymTest(syn);
    setSynonymResults((prev) => ({ ...prev, [syn.id]: result }));
    setRunningId(null);
  }, [runSynonymTest]);

  const passedCount = Object.values(results).filter((r) => r.passed).length + Object.values(synonymResults).filter(r => r.passed).length;
  const failedCount = Object.values(results).filter((r) => !r.passed).length + Object.values(synonymResults).filter(r => !r.passed).length;
  const totalRun = Object.keys(results).length + Object.keys(synonymResults).length;

  const activeSynonymsWithFilters = synonyms.filter(s => s.filters.length > 0 || !!s.badge_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Search className="h-5 w-5" /> Tests de Régression — Recherche
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {SEARCH_TEST_CASES.length} tests statiques + {activeSynonymsWithFilters.length} filtres synonymes actifs
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

      {/* Synonym filter tests */}
      {activeSynonymsWithFilters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtres Synonymes ({activeSynonymsWithFilters.length})
          </h4>
          {activeSynonymsWithFilters.map((syn) => {
            const result = synonymResults[syn.id];
            const isCurrentlyRunning = runningId === `syn-${syn.id}`;
            const subcats = [...new Set(syn.filters.map(f => f.subcategory_name).filter(Boolean))];
            const services = [...new Set(syn.filters.map(f => f.required_service).filter(Boolean))];
            const isBadgeOnly = syn.badge_id && syn.filters.length === 0;
            const filterDesc = isBadgeOnly
              ? "🏷️ Badge"
              : [
                  subcats.length > 0 ? subcats.join(", ") : null,
                  services.length > 0 ? services.join(", ") : null,
                ].filter(Boolean).join(" → ");

            return (
              <TestCaseRow
                key={syn.id}
                query={syn.key_word}
                description={`Filtre: ${filterDesc}${syn.synonyms.length > 0 ? ` · ${syn.synonyms.length} syn.` : ""}`}
                result={result}
                isRunning={isCurrentlyRunning}
                disabled={isRunning}
                onRun={() => runOneSynonymTest(syn)}
              />
            );
          })}
        </div>
      )}

      {/* Static test cases */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tests statiques</h4>
        {SEARCH_TEST_CASES.map((tc) => {
          const result = results[tc.id];
          const isCurrentlyRunning = runningId === tc.id;
          return (
            <TestCaseRow
              key={tc.id}
              query={tc.query}
              description={tc.description}
              result={result}
              isRunning={isCurrentlyRunning}
              disabled={isRunning}
              onRun={() => runOneTest(tc)}
            />
          );
        })}
      </div>
    </div>
  );
};

function TestCaseRow({
  query,
  description,
  result,
  isRunning,
  disabled,
  onRun,
}: {
  query: string;
  description: string;
  result?: TestResult;
  isRunning: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <Card
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
            {isRunning ? (
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
                  {query}
                </code>
                <span className="text-sm text-muted-foreground truncate">
                  {description}
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
            onClick={onRun}
            disabled={disabled}
            className="shrink-0"
          >
            <Play className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchRegressionPanel;
