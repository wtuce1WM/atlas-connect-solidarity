import { useState, useMemo } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { collectRatingSources, computeWeightedRatingOn20, getTotalReviewCount } from "@/lib/ratingUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, ExternalLink, Copy, AlertTriangle, Link2, Star, ArrowUp, ArrowDown, ArrowUpDown, MapPin } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useBusinessBrokenFiles } from "@/hooks/useBusinessBrokenFiles";

type SortKey = "name" | "city" | "main_category" | "gamme" | "rating" | "status" | "active" | "contact" | "price";
type SortDir = "asc" | "desc";

type Business = Tables<"businesses">;
type Gamme = { id: string; name_fr: string; color_hex: string | null; text_color_hex: string | null };

export type PriceCacheEntry = {
  business_id: string;
  source: string;
  price_per_night: number | null;
  currency: string | null;
};

interface BusinessTableProps {
  businesses: Business[];
  gammes: Gamme[];
  loading: boolean;
  onEdit: (business: Business) => void;
  onDelete: (id: string) => void;
  onDuplicate: (business: Business) => void;
  priceCache?: PriceCacheEntry[];
}

const BusinessTable = ({ businesses, gammes, loading, onEdit, onDelete, onDuplicate, priceCache = [] }: BusinessTableProps) => {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [businessToDuplicate, setBusinessToDuplicate] = useState<Business | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { brokenFilesMap } = useBusinessBrokenFiles(businesses);

  const getBusinessRating = (b: Business): number | null => {
    if (b.rating != null) return Number(b.rating);
    return computeWeightedRatingOn20(collectRatingSources(b));
  };

  // Build price lookup: business_id -> best price entry (prefer lowest price)
  const priceMap = useMemo(() => {
    const map = new Map<string, PriceCacheEntry>();
    for (const entry of priceCache) {
      const existing = map.get(entry.business_id);
      if (!existing || (entry.price_per_night != null && (existing.price_per_night == null || entry.price_per_night < existing.price_per_night))) {
        map.set(entry.business_id, entry);
      }
    }
    return map;
  }, [priceCache]);

  const sortedBusinesses = useMemo(() => {
    if (!sortKey) return businesses;
    const sorted = [...businesses].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "", "fr");
          break;
        case "city":
          cmp = (a.city || "").localeCompare(b.city || "", "fr");
          break;
        case "main_category":
          cmp = (a.main_category || "").localeCompare(b.main_category || "", "fr");
          break;
        case "gamme": {
          const gA = a.gamme_id ? gammes.find(g => g.id === a.gamme_id)?.name_fr || "" : "";
          const gB = b.gamme_id ? gammes.find(g => g.id === b.gamme_id)?.name_fr || "" : "";
          cmp = gA.localeCompare(gB, "fr");
          break;
        }
        case "rating": {
          const rA = getBusinessRating(a) ?? -1;
          const rB = getBusinessRating(b) ?? -1;
          cmp = rA - rB;
          break;
        }
        case "status":
          cmp = (a.wtuce_status || "").localeCompare(b.wtuce_status || "");
          break;
        case "active":
          cmp = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
          break;
        case "contact":
          cmp = (a.phone || a.email || "").localeCompare(b.phone || b.email || "", "fr");
          break;
        case "price": {
          const pA = priceMap.get(a.id)?.price_per_night ?? -1;
          const pB = priceMap.get(b.id)?.price_per_night ?? -1;
          cmp = pA - pB;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [businesses, sortKey, sortDir, gammes]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleDuplicateClick = (business: Business) => {
    setBusinessToDuplicate(business);
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (businessToDuplicate) {
      onDuplicate(businessToDuplicate);
    }
    setDuplicateDialogOpen(false);
    setBusinessToDuplicate(null);
  };
  if (loading) {
    return (
      <div className="bg-background rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
        <p className="text-muted-foreground mt-4">Chargement des entreprises...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="bg-background rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Aucune entreprise trouvée.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="inline-flex items-center">Nom<SortIcon column="name" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("city")}>
                <span className="inline-flex items-center">Ville<SortIcon column="city" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("main_category")}>
                <span className="inline-flex items-center">Catégorie principale<SortIcon column="main_category" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("gamme")}>
                <span className="inline-flex items-center">Gamme<SortIcon column="gamme" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("rating")}>
                <span className="inline-flex items-center">Note & Avis<SortIcon column="rating" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                <span className="inline-flex items-center">Statut<SortIcon column="status" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("active")}>
                <span className="inline-flex items-center">Actif<SortIcon column="active" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("contact")}>
                <span className="inline-flex items-center">Contact<SortIcon column="contact" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("price")}>
                <span className="inline-flex items-center">Prix/nuit<SortIcon column="price" /></span>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBusinesses.map((business) => {
              const brokenInfo = brokenFilesMap[business.id];
              return (
              <TableRow key={business.id}>
                <TableCell className="w-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(business)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8"
                    title="Modifier"
                  >
                    <Edit className="h-5 w-5" />
                  </Button>
                </TableCell>
                <TableCell className="w-10">
                  {brokenInfo && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center p-1.5 bg-amber-500/10 text-amber-600 rounded-full cursor-help">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium mb-1">{brokenInfo.totalBroken} fichier(s) manquant(s)</p>
                        <ul className="text-xs space-y-0.5">
                          {brokenInfo.brokenImages > 0 && (
                            <li>• {brokenInfo.brokenImages} image(s)</li>
                          )}
                          {brokenInfo.brokenLogo && <li>• Logo</li>}
                          {brokenInfo.brokenPdf && <li>• PDF</li>}
                          {brokenInfo.brokenLabel && <li>• Label</li>}
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{business.name}</span>
                    {business.is_poi && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600 bg-blue-50">
                        <MapPin className="h-2.5 w-2.5 mr-0.5" />POI
                      </Badge>
                    )}
                    {business.kp_regroupement && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center p-1 bg-primary/10 text-primary rounded-full cursor-help">
                            <Link2 className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">KP: {business.kp_regroupement}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gold hover:underline inline-flex items-center gap-1"
                      >
                        Site web <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <a
                      href={businessUrl(business)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Fiche <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TableCell>
                <TableCell>
                  <div>{business.city}</div>
                  <div className="text-sm text-muted-foreground">{business.region}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {business.main_category ? (
                      <Badge variant="outline" className="font-normal w-fit">
                        {business.main_category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {business.categories && business.categories.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        → {business.categories[0]}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const gamme = business.gamme_id ? gammes.find(g => g.id === business.gamme_id) : null;
                    if (!gamme) return <span className="text-muted-foreground">-</span>;
                    return (
                      <Badge
                        className="text-xs border border-black"
                        style={{ backgroundColor: gamme.color_hex || '#666666', color: gamme.text_color_hex || '#000000' }}
                      >
                        {gamme.name_fr}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    // Use manual rating if set, otherwise weighted average normalized to /20
                    if (business.rating != null) {
                      const totalReviews = (business.google_review_count || 0) + (business.tripadvisor_review_count || 0) + (business.restaurant_guru_review_count || 0);
                      return (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{String(business.rating)}/20</span>
                          {totalReviews > 0 && <span className="text-muted-foreground">({totalReviews})</span>}
                        </div>
                      );
                    }
                    // Weighted average from platforms
                    const avg = computeWeightedRatingOn20(collectRatingSources(business));
                    if (avg === null) return <span className="text-muted-foreground text-sm">-</span>;
                    const totalReviews = getTotalReviewCount(business);
                    return (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{avg}/20</span>
                        {totalReviews > 0 && <span className="text-muted-foreground">({totalReviews})</span>}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={business.wtuce_status === "verified" ? "default" : "secondary"}
                    className={
                      business.wtuce_status === "verified"
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                    }
                  >
                    {business.wtuce_status === "verified" ? "Vérifié" : "En attente"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={(business as any).is_active !== false ? "default" : "secondary"}
                    className={
                      (business as any).is_active !== false
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    }
                  >
                    {(business as any).is_active !== false ? "Oui" : "Non"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {business.phone && <div>{business.phone}</div>}
                    {business.email && (
                      <div className="text-muted-foreground">{business.email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateClick(business)}
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dupliquer cette fiche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une copie de la fiche "{businessToDuplicate?.name}" sera créée. Vous pourrez ensuite la modifier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>
              Dupliquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entreprise ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{businessToDelete?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-between sm:justify-between">
            <AlertDialogCancel className="bg-green-600 text-white hover:bg-green-700 hover:text-white border-none">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (businessToDelete) {
                  onDelete(businessToDelete.id);
                }
                setDeleteDialogOpen(false);
                setBusinessToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
};

export default BusinessTable;
