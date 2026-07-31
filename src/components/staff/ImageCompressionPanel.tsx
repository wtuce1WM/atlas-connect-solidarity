import { useCallback, useMemo, useState } from "react";
import { Loader2, ImageDown, Search, Undo2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ScanResult = {
  business?: string;
  slug?: string;
  totalImages?: number;
  candidates?: number;
  totalKb?: number;
  details?: { path: string; sizeKb: number }[];
  dryRun?: boolean;
  processed?: number;
  savedMb?: number;
  results?: any[];
  reverted?: number;
  error?: string;
};

export default function ImageCompressionPanel() {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [minSizeKb, setMinSizeKb] = useState(500);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;
    const { data } = await supabase
      .from("businesses")
      .select("id, name, city")
      .ilike("name", `%${query.trim()}%`)
      .limit(10);
    setOptions(data || []);
  }, [query]);

  const call = useCallback(
    async (mode: "dry" | "run" | "revert") => {
      if (!selected) return;
      setBusy(mode);
      setResult(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recompress-business-images`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              business_id: selected.id,
              min_size_kb: minSizeKb,
              dry_run: mode === "dry",
              revert: mode === "revert",
              limit: 40,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur");
        setResult(data);
        toast({
          title:
            mode === "dry"
              ? `${data.candidates ?? 0} image(s) à optimiser`
              : mode === "revert"
              ? `${data.reverted ?? 0} image(s) restaurée(s)`
              : `${data.processed ?? 0} image(s) compressée(s) — ${data.savedMb ?? 0} Mo économisés`,
        });
      } catch (e: any) {
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      } finally {
        setBusy(null);
      }
    },
    [selected, minSizeKb]
  );

  const errors = useMemo(
    () => (result?.results || []).filter((r: any) => r.error),
    [result]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageDown className="h-5 w-5 text-primary" />
          Compression d'images (test au cas par cas)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Non destructif : la version compressée (WebP, max 1920 px) est écrite dans un nouveau
          chemin <code>owm-compressed/</code>, l'original est conservé et le retour arrière est
          possible.
        </p>

        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Rechercher un établissement…"
            className="max-w-xs h-9"
          />
          <Button size="sm" variant="outline" onClick={search}>
            <Search className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={minSizeKb}
            onChange={(e) => setMinSizeKb(Number(e.target.value) || 0)}
            className="w-28 h-9"
            title="Seuil en Ko"
          />
          <span className="text-xs text-muted-foreground self-center">Ko min.</span>
        </div>

        {options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={selected?.id === o.id ? "default" : "outline"}
                onClick={() => setSelected({ id: o.id, name: o.name })}
              >
                {o.name}
                {o.city ? ` · ${o.city}` : ""}
              </Button>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selected.name}</Badge>
            <Button size="sm" variant="outline" onClick={() => call("dry")} disabled={!!busy}>
              {busy === "dry" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Analyser
            </Button>
            <Button size="sm" onClick={() => call("run")} disabled={!!busy}>
              {busy === "run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Compresser
            </Button>
            <Button size="sm" variant="outline" onClick={() => call("revert")} disabled={!!busy}>
              {busy === "revert" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Annuler (restaurer)
            </Button>
          </div>
        )}

        {result && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-2 max-h-72 overflow-auto">
            {result.dryRun ? (
              <>
                <div>
                  {result.candidates} image(s) ≥ {minSizeKb} Ko sur {result.totalImages} —{" "}
                  {Math.round(((result.totalKb || 0) / 1024) * 10) / 10} Mo concernés
                </div>
                {result.details?.map((d) => (
                  <div key={d.path} className="flex justify-between gap-2">
                    <span className="truncate">{d.path}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{d.sizeKb} Ko</span>
                  </div>
                ))}
              </>
            ) : result.reverted !== undefined ? (
              <div>{result.reverted} image(s) restaurée(s) à leur version d'origine.</div>
            ) : (
              <>
                <div>
                  {result.processed} compressée(s) · {result.savedMb} Mo économisés
                </div>
                {result.results?.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="truncate">{r.path}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {r.error ? `⚠️ ${r.error}` : r.skipped ? r.skipped : `${r.fromKb} → ${r.toKb} Ko`}
                    </span>
                  </div>
                ))}
                {errors.length > 0 && (
                  <div className="text-destructive">{errors.length} échec(s)</div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
