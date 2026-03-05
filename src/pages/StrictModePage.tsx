import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, MapPin, Star, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StrictSubcategory {
  subcategory_id: string;
  subcategory_name: string;
  max_results: number | null;
  boost_weight: number;
}

interface Business {
  id: string;
  name: string;
  city: string | null;
  neighborhood: string | null;
  main_category: string | null;
  categories: string[] | null;
  services: string[] | null;
  logo_url: string | null;
  images: string[] | null;
  google_rating: number | null;
  google_review_count: number | null;
  priority_score: number | null;
  wtuce_status: string | null;
}

const StrictModePage = () => {
  const [strictSubs, setStrictSubs] = useState<StrictSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMeta, setSearchMeta] = useState<any>(null);

  // Fetch all subcategories with strict mode
  useEffect(() => {
    const fetch = async () => {
      const { data: configs } = await supabase
        .from("subcategory_search_config")
        .select("subcategory_id, max_results, boost_weight, search_mode")
        .eq("search_mode", "strict");

      if (!configs || configs.length === 0) {
        setLoading(false);
        return;
      }

      // Get subcategory names
      const subIds = configs.map(c => c.subcategory_id);
      const { data: subs } = await supabase
        .from("subcategories" as any)
        .select("id, name_fr")
        .in("id", subIds);

      const subsMap = new Map((subs as any[] || []).map((s: any) => [s.id, s.name_fr]));

      const result: StrictSubcategory[] = configs
        .map(c => ({
          subcategory_id: c.subcategory_id,
          subcategory_name: subsMap.get(c.subcategory_id) || "Inconnu",
          max_results: c.max_results,
          boost_weight: Number(c.boost_weight),
        }))
        .sort((a, b) => a.subcategory_name.localeCompare(b.subcategory_name, "fr"));

      setStrictSubs(result);
      setLoading(false);
    };
    fetch();
  }, []);

  // Search when query selected
  useEffect(() => {
    if (!selectedQuery) {
      setBusinesses([]);
      setSearchMeta(null);
      return;
    }

    const doSearch = async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("business-search", {
          body: { query: selectedQuery, limit: 60, language: "fr" },
        });

        if (error) {
          console.error("Search error:", error);
          setBusinesses([]);
          setSearchMeta(null);
        } else {
          setBusinesses(data?.businesses || []);
          setSearchMeta({
            detectedCity: data?.detectedCity,
            detectedSubcategory: data?.detectedSubcategory,
            detectedNeighborhood: data?.detectedNeighborhood,
            searchLevel: data?.searchLevel,
            totalResults: data?.businesses?.length || 0,
          });
        }
      } catch (e) {
        console.error(e);
      }
      setSearching(false);
    };
    doSearch();
  }, [selectedQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-['Playfair_Display'] italic">
            Mode Strict
          </h1>
          <p className="text-white/60 mt-2">
            Toutes les sous-catégories configurées en mode strict — sélectionnez pour visualiser les résultats.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : strictSubs.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">
            Aucune sous-catégorie en mode strict.
          </p>
        ) : (
          <>
            {/* Dropdown */}
            <div className="max-w-md mb-8">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Requête strict ({strictSubs.length})
              </label>
              <Select
                value={selectedQuery || ""}
                onValueChange={(v) => setSelectedQuery(v || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez une sous-catégorie…" />
                </SelectTrigger>
                <SelectContent>
                  {strictSubs.map((s) => (
                    <SelectItem key={s.subcategory_id} value={s.subcategory_name}>
                      {s.subcategory_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search metadata */}
            {searchMeta && (
              <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
                <div className="flex flex-wrap gap-4">
                  <span><strong>Requête :</strong> {selectedQuery}</span>
                  <span><strong>Résultats :</strong> {searchMeta.totalResults}</span>
                  {searchMeta.detectedCity && (
                    <span><strong>Ville :</strong> {searchMeta.detectedCity}</span>
                  )}
                  {searchMeta.detectedSubcategory && (
                    <span><strong>Sous-catégorie :</strong> {searchMeta.detectedSubcategory}</span>
                  )}
                  {searchMeta.searchLevel && (
                    <span><strong>Niveau :</strong> {searchMeta.searchLevel}</span>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {searching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : businesses.length > 0 ? (
              <div className="space-y-2">
                {businesses.map((b, idx) => (
                  <Card key={b.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <span className="text-xs text-muted-foreground font-mono w-6 text-right shrink-0">
                        {idx + 1}
                      </span>

                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="h-10 w-10 rounded object-contain bg-muted shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/business/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm truncate hover:text-primary transition-colors"
                          >
                            {b.name}
                          </a>
                          {b.wtuce_status === "verified" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {b.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" /> {b.city}
                              {b.neighborhood && ` · ${b.neighborhood}`}
                            </span>
                          )}
                          {b.categories && b.categories.length > 0 && (
                            <span className="truncate">{b.categories.join(", ")}</span>
                          )}
                        </div>
                      </div>

                      {b.google_rating && (
                        <div className="flex items-center gap-1 text-xs shrink-0">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          <span>{b.google_rating}</span>
                          {b.google_review_count && (
                            <span className="text-muted-foreground">({b.google_review_count})</span>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-muted-foreground shrink-0">
                        P:{b.priority_score ?? 0}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : selectedQuery ? (
              <p className="text-center py-12 text-muted-foreground">
                Aucun résultat pour « {selectedQuery} »
              </p>
            ) : null}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default StrictModePage;
