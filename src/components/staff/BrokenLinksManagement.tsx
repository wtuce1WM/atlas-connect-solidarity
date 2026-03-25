import { useState, useCallback, useEffect } from "react";
import { LinkIcon, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { invalidateBrokenLinksCache } from "@/hooks/useBrokenLinks";

type BrokenLink = {
  id: string;
  url: string;
  business_id: string;
  field_name: string;
  http_status: number | null;
  error_message: string | null;
  updated_at: string;
};

type BrokenLinkWithBusiness = BrokenLink & { business_name?: string };

const FIELD_LABELS: Record<string, string> = {
  website: "Site web",
  menu_url: "Menu",
  flipbook_url: "Flipbook",
  pdf_url: "PDF",
  pdf_2_url: "PDF 2",
  pdf_3_url: "PDF 3",
  reserve_now_url: "Réservation",
  booking_url: "Booking",
  other_booking_url: "Autre réservation",
  online_shop_url: "Boutique",
  video_1_url: "Vidéo",
  glovo_url: "Glovo",
  matterport_url: "Matterport",
};

const BrokenLinksManagement = () => {
  const [brokenLinks, setBrokenLinks] = useState<BrokenLinkWithBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  const fetchBrokenLinks = useCallback(async () => {
    setIsLoadingList(true);
    const { data } = await (supabase as any)
      .from("broken_links")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const links = (data || []) as BrokenLink[];

    // Fetch business names
    const bizIds = [...new Set(links.map((l) => l.business_id))];
    let bizNames = new Map<string, string>();
    if (bizIds.length > 0) {
      const { data: bizData } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", bizIds);
      for (const b of bizData || []) {
        bizNames.set(b.id, b.name);
      }
    }

    setBrokenLinks(
      links.map((l) => ({
        ...l,
        business_name: bizNames.get(l.business_id) || l.business_id,
      }))
    );
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    fetchBrokenLinks();
  }, [fetchBrokenLinks]);

  const handleScan = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-broken-links");
      if (error) throw error;
      setSummary(data.summary || null);
      await fetchBrokenLinks();
      invalidateBrokenLinksCache();
      toast({
        title: "Scan terminé",
        description: `${data.summary?.brokenUrls || 0} URLs cassées détectées.`,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBrokenLinks]);

  const handleRemove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("broken_links")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        await fetchBrokenLinks();
        invalidateBrokenLinksCache();
        toast({ title: "Lien retiré de la liste" });
      }
    },
    [fetchBrokenLinks]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-destructive" />
            Liens cassés
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleScan} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Scanner
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Le scan vérifie toutes les URLs des établissements (menus, réservations, sites web…).
          Les liens cassés sont masqués automatiquement dans les fiches.
        </p>

        {summary && (
          <div className="flex gap-4 text-sm flex-wrap">
            <Badge variant="outline">{summary.totalUrls} URLs scannées</Badge>
            <Badge variant="destructive">{summary.brokenUrls} cassées</Badge>
            <Badge variant="secondary">{summary.totalBusinesses} établissements</Badge>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-sm font-medium">
            Liste active ({brokenLinks.length} liens cassés) :
          </p>
          {isLoadingList ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
            </div>
          ) : brokenLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Aucun lien cassé détecté.</p>
          ) : (
            <div className="overflow-auto border rounded-md max-h-80">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Établissement</th>
                    <th className="text-left p-2">Champ</th>
                    <th className="text-left p-2">URL</th>
                    <th className="text-left p-2">Status</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {brokenLinks.map((link) => (
                    <tr key={link.id} className="border-t">
                      <td className="p-2 font-medium max-w-[150px] truncate">
                        {link.business_name}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {FIELD_LABELS[link.field_name] || link.field_name}
                      </td>
                      <td className="p-2 font-mono text-muted-foreground max-w-[250px] truncate">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {link.url}
                        </a>
                      </td>
                      <td className="p-2">
                        <Badge variant="destructive" className="text-[10px]">
                          {link.http_status || link.error_message || "Erreur"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => handleRemove(link.id)}
                          className="text-destructive hover:text-destructive/80"
                          title="Retirer de la liste"
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

export default BrokenLinksManagement;
