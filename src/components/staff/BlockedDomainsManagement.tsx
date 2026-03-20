import { useState, useCallback, useEffect } from "react";
import { ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const KNOWN_BLOCKED_DOMAINS = [
  { domain: 'www.mandarinoriental.com', reason: 'X-Frame-Options: DENY' },
  { domain: 'www.riadelhara.com', reason: 'X-Frame-Options: DENY' },
  { domain: 'www.jetex.com', reason: 'X-Frame-Options: DENY' },
  { domain: 'www.selman-marrakech.com', reason: 'X-Frame-Options: DENY' },
  { domain: 'reservation.marrakech.maison-stella-cadente.com', reason: 'X-Frame-Options: DENY' },
  { domain: 'permalink.fairmont.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.lunajets.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.essaouirakitesurfschool.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.cenizaro.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'linktr.ee', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'xaluca.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'app.thebookingbutton.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'resnexus.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'nomadmarrakech.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'lblassa.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'direct-book.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.lebarometre.net', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.essaouira-lodge.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.palaborepmarrakech.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.pestana.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.beachcomber.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.belmond.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.fourseasons.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.ritzcarlton.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.sofitel-marrakech.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.saintjamesmarrakech.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.kensington-marrakech.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'mamounia.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.nobuhotels.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.oberoihotels.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.widiane.net', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.cactusthiemann.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.foundouk.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'goodkarmatravels.jimdosite.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'reservations.verticalbooking.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'rentaphone.ma', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'fr.hotels.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.riadtammam.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'book-directonline.com', reason: 'X-Frame-Options: SAMEORIGIN' },
  { domain: 'www.relaischateaux.com', reason: 'CSP frame-ancestors: self' },
  { domain: 'www.onomohotels.com', reason: 'CSP frame-ancestors: self' },
];

type BusinessDomainRow = { businessName: string; domain: string; reason: string };

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

const BlockedDomainsManagement = () => {
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [businessRows, setBusinessRows] = useState<BusinessDomainRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // Fetch businesses matching blocked domains on mount
  useEffect(() => {
    (async () => {
      try {
        const blockedSet = new Set(KNOWN_BLOCKED_DOMAINS.map(d => d.domain));
        const reasonMap = new Map(KNOWN_BLOCKED_DOMAINS.map(d => [d.domain, d.reason]));

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
      } catch {
        // fallback: show domain-only list
      } finally {
        setLoadingRows(false);
      }
    })();
  }, []);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-iframe-blocked");
      if (error) throw error;
      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          Ces domaines empêchent l'affichage de leur site dans une iframe (via <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Frame-Options</code> ou <code className="text-xs bg-muted px-1 py-0.5 rounded">CSP frame-ancestors</code>).
          Lorsqu'un utilisateur clique sur « Réserver » pour un établissement dont l'URL appartient à l'un de ces domaines, un bouton « Ouvrir la réservation » (lien externe) s'affiche immédiatement au lieu de tenter de charger l'iframe.
        </p>
        <p className="text-xs text-muted-foreground">
          Cette liste est codée en dur dans <code className="bg-muted px-1 py-0.5 rounded">BookingOverlay.tsx</code>. Pour la mettre à jour, lancez un scan puis modifiez le fichier source.
        </p>

        {summary && (
          <div className="flex gap-4 text-sm">
            <Badge variant="outline">{summary.totalDomains} domaines scannés</Badge>
            <Badge variant="destructive">{summary.blockedDomains} bloqués</Badge>
            <Badge variant="secondary">{summary.totalBusinessesAffected} établissements concernés</Badge>
          </div>
        )}

        {results && results.filter((r: any) => r.blocked).length > 0 && (
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
                  {results.filter((r: any) => r.blocked).map((r: any, i: number) => (
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

        <div className="space-y-1">
          <p className="text-sm font-medium">
            Liste actuelle ({KNOWN_BLOCKED_DOMAINS.length} domaines, {businessRows.length} établissements) :
          </p>
          {loadingRows ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="overflow-auto border rounded-md">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Établissement</th>
                    <th className="text-left p-2">Domaine</th>
                    <th className="text-left p-2">Raison du blocage</th>
                  </tr>
                </thead>
                <tbody>
                  {businessRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{row.businessName}</td>
                      <td className="p-2 font-mono text-muted-foreground">{row.domain}</td>
                      <td className="p-2 text-muted-foreground">{row.reason}</td>
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
