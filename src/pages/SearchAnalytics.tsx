import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowUpDown, Clock, BarChart3, ArrowUp, ArrowDown, Minus, RefreshCw, Play } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SearchLog {
  id: string;
  query: string;
  effective_query: string | null;
  detected_city: string | null;
  detected_neighborhood: string | null;
  detected_subcategory: string | null;
  search_mode: string | null;
  search_level: string | null;
  total_results: number;
  rerank_applied: boolean;
  rerank_latency_ms: number | null;
  results_before: string[] | null;
  results_after: string[] | null;
  movements: { name: string; diff: number }[] | null;
  is_superlative: boolean;
  created_at: string;
}

interface LiveResult {
  businesses: { id: string; name: string; city: string; main_category: string }[];
  searchLevel: string;
  totalResults: number;
}

const SearchAnalytics = ({ embedded = false }: { embedded?: boolean }) => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SearchLog | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({ total: 0, reranked: 0, avgLatency: 0 });

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("search_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) {
      setLogs(data as unknown as SearchLog[]);
      const reranked = data.filter((l: any) => l.rerank_applied);
      const avgLat = reranked.length > 0
        ? Math.round(reranked.reduce((sum: number, l: any) => sum + (l.rerank_latency_ms || 0), 0) / reranked.length)
        : 0;
      setStats({ total: data.length, reranked: reranked.length, avgLatency: avgLat });
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const runTestQuery = async () => {
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-search", {
        body: { query: testQuery, limit: 30 },
      });
      if (data && !error) {
        setLiveResult({
          businesses: data.businesses?.map((b: any) => ({
            id: b.id, name: b.name, city: b.city, main_category: b.main_category,
          })) || [],
          searchLevel: data.searchLevel,
          totalResults: data.totalResults,
        });
        setTimeout(fetchLogs, 1500);
      }
    } catch (e) {
      console.error(e);
    }
    setIsSearching(false);
  };

  const MovementIcon = ({ diff }: { diff: number }) => {
    if (diff > 0) return <span className="text-emerald-500 flex items-center gap-0.5 text-xs font-bold"><ArrowUp className="h-3 w-3" />↑{diff}</span>;
    if (diff < 0) return <span className="text-red-500 flex items-center gap-0.5 text-xs font-bold"><ArrowDown className="h-3 w-3" />↓{Math.abs(diff)}</span>;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const renderContent = () => (
    <div className={embedded ? "space-y-8" : "container mx-auto px-4 py-8 space-y-8"}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Recherches loguées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-600">{stats.reranked}</div>
            <p className="text-sm text-muted-foreground">Avec re-ranking LLM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.avgLatency}ms</div>
            <p className="text-sm text-muted-foreground">Latence moyenne re-rank</p>
          </CardContent>
        </Card>
      </div>

      {/* Live test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" /> Tester une requête</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="ex: restaurant marrakech, spa essaouira..."
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runTestQuery()}
              className="flex-1"
            />
            <Button onClick={runTestQuery} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Rechercher
            </Button>
          </div>
          {liveResult && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{liveResult.searchLevel}</Badge>
                <span>{liveResult.totalResults} résultats</span>
              </div>
              <div className="grid gap-1 max-h-60 overflow-y-auto">
                {liveResult.businesses.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="text-muted-foreground w-6 text-right font-mono">{i + 1}.</span>
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground text-xs">{b.city} · {b.main_category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Historique des recherches</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {logs.map(log => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-3 ${
                    selectedLog?.id === log.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-muted-foreground text-xs font-mono w-16 shrink-0">
                    {format(new Date(log.created_at), "HH:mm:ss", { locale: fr })}
                  </span>
                  <span className="font-medium truncate flex-1">"{log.query}"</span>
                  {log.detected_city && <Badge variant="secondary" className="text-xs shrink-0">{log.detected_city}</Badge>}
                  {log.detected_subcategory && <Badge variant="outline" className="text-xs shrink-0">{log.detected_subcategory}</Badge>}
                  <span className="text-muted-foreground text-xs shrink-0">{log.total_results} rés.</span>
                  {log.rerank_applied ? (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs shrink-0">
                      <ArrowUpDown className="h-3 w-3 mr-1" />{log.rerank_latency_ms}ms
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">pas de rerank</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected log detail */}
      {selectedLog && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">
              Détail : "{selectedLog.query}"
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {format(new Date(selectedLog.created_at), "d MMM yyyy à HH:mm:ss", { locale: fr })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Query effective :</span> <strong>{selectedLog.effective_query}</strong></div>
              <div><span className="text-muted-foreground">Ville :</span> <strong>{selectedLog.detected_city || "—"}</strong></div>
              <div><span className="text-muted-foreground">Quartier :</span> <strong>{selectedLog.detected_neighborhood || "—"}</strong></div>
              <div><span className="text-muted-foreground">Sous-catégorie :</span> <strong>{selectedLog.detected_subcategory || "—"}</strong></div>
              <div><span className="text-muted-foreground">Mode :</span> <strong>{selectedLog.search_mode || "—"}</strong></div>
              <div><span className="text-muted-foreground">Niveau :</span> <strong>{selectedLog.search_level}</strong></div>
              <div><span className="text-muted-foreground">Résultats :</span> <strong>{selectedLog.total_results}</strong></div>
              <div><span className="text-muted-foreground">Superlatif :</span> <strong>{selectedLog.is_superlative ? "Oui" : "Non"}</strong></div>
            </div>

            {selectedLog.rerank_applied && selectedLog.results_before && selectedLog.results_after && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-emerald-600" />
                  Comparaison avant/après re-ranking
                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">{selectedLog.rerank_latency_ms}ms</Badge>
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">AVANT (SQL)</h4>
                    <div className="space-y-1">
                      {selectedLog.results_before.map((name, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground font-mono w-5 text-right">{i + 1}.</span>
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">APRÈS (LLM)</h4>
                    <div className="space-y-1">
                      {selectedLog.results_after.map((name, i) => {
                        const movement = selectedLog.movements?.find(m => m.name === name);
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/30 rounded">
                            <span className="text-muted-foreground font-mono w-5 text-right">{i + 1}.</span>
                            <span className="flex-1">{name}</span>
                            {movement && <MovementIcon diff={movement.diff} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!selectedLog.rerank_applied && selectedLog.results_after && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Résultats (sans re-ranking)</h3>
                <div className="space-y-1">
                  {selectedLog.results_after.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground font-mono w-5 text-right">{i + 1}.</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTestQuery(selectedLog.query);
                runTestQuery();
              }}
            >
              <Play className="h-4 w-4 mr-1" /> Rejouer cette requête
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <BarChart3 className="h-6 w-6" /> Search Analytics
          </h2>
          <p className="text-muted-foreground mt-1">Dashboard de performance du moteur de recherche et du re-ranking LLM</p>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8" /> Search Analytics
          </h1>
          <p className="text-white/60 mt-2">Dashboard de performance du moteur de recherche et du re-ranking LLM</p>
        </div>
      </div>
      {renderContent()}
      <Footer />
    </div>
  );
};

export default SearchAnalytics;
