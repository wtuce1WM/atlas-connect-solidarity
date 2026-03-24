import { useState, useCallback, useEffect } from "react";
import { ShieldAlert, RefreshCw, Loader2, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { invalidateBlockedDomainsCache } from "@/hooks/useBlockedDomains";

type BlockedDomain = {
  id: string;
  domain: string;
  reason: string;
  is_active: boolean;
  updated_at: string;
};

type BusinessDomainRow = { businessName: string; domain: string; reason: string };

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

const BlockedDomainsManagement = () => {
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [businessRows, setBusinessRows] = useState<BusinessDomainRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [newReason, setNewReason] = useState("");

  // Fetch blocked domains from DB
  const fetchDomains = useCallback(async () => {
    setIsLoadingDomains(true);
    const { data } = await supabase
      .from("blocked_domains")
      .select("*")
      .eq("is_active", true)
      .order("domain");
    setBlockedDomains((data as BlockedDomain[]) || []);
    setIsLoadingDomains(false);
  }, []);

  // Fetch businesses matching blocked domains
  const fetchBusinessRows = useCallback(async (domains: BlockedDomain[]) => {
    setLoadingRows(true);
    try {
      const blockedSet = new Set(domains.map(d => d.domain));
      const reasonMap = new Map(domains.map(d => [d.domain, d.reason]));

      const fields = "name, reserve_now_url, booking_url, other_booking_url";
      const [r1, r2, r3] = await Promise.all([
        supabase.from("businesses").select(fields).eq("is_active", true).not("reserve_now_url", "is", null),
        supabase.from("businesses").select(fields).eq("is_active", true).not("booking_url", "is", null),
        supabase.from("businesses").select(fields).eq("is_active", true).not("other_booking_url", "is", null),
      ]);

      const allMap = new Map<string, any>();
      for (const list of [r1.data || [], r2.data || [], r3.data || []]) {
        for (const b of list) allMap.set(b.name + (b.reserve_now_url || "") + (b.booking_url || ""), b);
      }

      const rows: BusinessDomainRow[] = [];
      for (const b of allMap.values()) {
        const urls = [b.reserve_now_url, b.booking_url, b.other_booking_url].filter(Boolean);
        for (const url of urls) {
          const domain = extractDomain(url);
          if (blockedSet.has(domain)) {
            rows.push({ businessName: b.name, domain, reason: reasonMap.get(domain) || "" });
          }
        }
      }
      rows.sort((a, b) => a.businessName.localeCompare(b.businessName, "fr"));
      setBusinessRows(rows);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    if (blockedDomains.length > 0) {
      fetchBusinessRows(blockedDomains);
    } else if (!isLoadingDomains) {
      setBusinessRows([]);
      setLoadingRows(false);
    }
  }, [blockedDomains, isLoadingDomains, fetchBusinessRows]);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-iframe-blocked");
      if (error) throw error;
      setScanResults(data.results || []);
      setSummary(data.summary || null);
      // Refresh the domain list from DB after scan persisted results
      await fetchDomains();
      invalidateBlockedDomainsCache();
      toast({ title: "Scan terminé", description: `${data.summary?.blockedDomains || 0} domaines bloqués détectés et sauvegardés.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchDomains]);

  const handleAddDomain = useCallback(async () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    const { error } = await supabase
      .from("blocked_domains")
      .upsert({ domain, reason: newReason || "Ajouté manuellement", is_active: true, updated_at: new Date().toISOString() }, { onConflict: "domain" });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewDomain("");
      setNewReason("");
      await fetchDomains();
      invalidateBlockedDomainsCache();
      toast({ title: "Domaine ajouté" });
    }
  }, [newDomain, newReason, fetchDomains]);

  const handleRemoveDomain = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("blocked_domains")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await fetchDomains();
      invalidateBlockedDomainsCache();
      toast({ title: "Domaine retiré" });
    }
  }, [fetchDomains]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Domaines bloqués en iframe
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleScan} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Scanner
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ces domaines empêchent l'affichage dans une iframe. Le scan met automatiquement à jour cette liste en base de données.
          Lorsqu'un utilisateur clique sur « Réserver », les domaines bloqués s'ouvrent directement dans un nouvel onglet.
        </p>

        {summary && (
          <div className="flex gap-4 text-sm">
            <Badge variant="outline">{summary.totalDomains} domaines scannés</Badge>
            <Badge variant="destructive">{summary.blockedDomains} bloqués</Badge>
            <Badge variant="secondary">{summary.totalBusinessesAffected} établissements concernés</Badge>
          </div>
        )}

        {scanResults && scanResults.filter((r: any) => r.blocked).length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Résultats du scan :</p>
            <div className="max-h-60 overflow-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Domaine</th>
                    <th className="text-left p-2">Raison</th>
                    <th className="text-right p-2">Étab.</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResults.filter((r: any) => r.blocked).map((r: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{r.domain}</td>
                      <td className="p-2 text-muted-foreground">{r.reason}</td>
                      <td className="p-2 text-right">{r.businessCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add domain manually */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Domaine</label>
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Raison</label>
            <Input
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="X-Frame-Options: SAMEORIGIN"
              className="h-8 text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleAddDomain} disabled={!newDomain.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">
            Liste active ({blockedDomains.length} domaines, {businessRows.length} établissements) :
          </p>
          {isLoadingDomains || loadingRows ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="overflow-auto border rounded-md max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Établissement</th>
                    <th className="text-left p-2">Domaine</th>
                    <th className="text-left p-2">Raison</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {businessRows.map((row, i) => {
                    const domainEntry = blockedDomains.find(d => d.domain === row.domain);
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-medium">{row.businessName}</td>
                        <td className="p-2 font-mono text-muted-foreground">{row.domain}</td>
                        <td className="p-2 text-muted-foreground">{row.reason}</td>
                        <td className="p-2">
                          {domainEntry && (
                            <button
                              onClick={() => handleRemoveDomain(domainEntry.id)}
                              className="text-destructive hover:text-destructive/80"
                              title="Retirer ce domaine"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Show domains without matching businesses */}
                  {blockedDomains
                    .filter(d => !businessRows.some(r => r.domain === d.domain))
                    .map((d) => (
                      <tr key={d.id} className="border-t opacity-60">
                        <td className="p-2 text-muted-foreground italic">—</td>
                        <td className="p-2 font-mono text-muted-foreground">{d.domain}</td>
                        <td className="p-2 text-muted-foreground">{d.reason}</td>
                        <td className="p-2">
                          <button
                            onClick={() => handleRemoveDomain(d.id)}
                            className="text-destructive hover:text-destructive/80"
                            title="Retirer ce domaine"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlockedDomainsManagement;
