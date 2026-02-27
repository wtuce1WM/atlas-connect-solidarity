import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Edit, ExternalLink, Star, MapPin, Navigation, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Business = Tables<"businesses">;

interface BusinessOverviewTabProps {
  businesses: Business[];
  loading: boolean;
  onEdit: (business: Business) => void;
}

type BadgeRow = { id: string; name_fr: string; color_hex: string | null; text_color_hex: string | null };
type BusinessBadgeRow = { business_id: string; badge_id: string; is_default: boolean };
type BusinessDestRow = { business_id: string; destination_id: string };
type DestRow = { id: string; name_fr: string };
type BusinessLabelRow = { business_id: string; label_id: string };
type LabelRow = { id: string; name_fr: string };

const BusinessOverviewTab = ({ businesses, loading, onEdit }: BusinessOverviewTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [subcategories, setSubcategories] = useState<{ id: string; name_fr: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 50;

  // Extra data
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [businessBadges, setBusinessBadges] = useState<BusinessBadgeRow[]>([]);
  const [destinations, setDestinations] = useState<DestRow[]>([]);
  const [businessDestinations, setBusinessDestinations] = useState<BusinessDestRow[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);
  const [businessLabels, setBusinessLabels] = useState<BusinessLabelRow[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [badgesRes, bbRes, destRes, bdRes, labelsRes, blRes] = await Promise.all([
        supabase.from("badges").select("id, name_fr, color_hex, text_color_hex").order("sort_order"),
        supabase.from("business_badges").select("business_id, badge_id, is_default"),
        supabase.from("destinations").select("id, name_fr").order("name_fr"),
        supabase.from("business_destinations").select("business_id, destination_id"),
        supabase.from("labels").select("id, name_fr").order("name_fr"),
        supabase.from("business_labels").select("business_id, label_id"),
      ]);
      if (badgesRes.data) setBadges(badgesRes.data);
      if (bbRes.data) setBusinessBadges(bbRes.data);
      if (destRes.data) setDestinations(destRes.data);
      if (bdRes.data) setBusinessDestinations(bdRes.data);
      if (labelsRes.data) setLabels(labelsRes.data);
      if (blRes.data) setBusinessLabels(blRes.data);
    };
    fetchAll();
  }, []);

  const uniqueCities = useMemo(() =>
    [...new Set(businesses.map(b => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );
  const uniqueCategories = useMemo(() =>
    [...new Set(businesses.map(b => b.main_category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [businesses]
  );

  // Fetch subcategories when category changes
  useEffect(() => {
    setSubcategoryFilter("all");
    if (categoryFilter === "all") { setSubcategories([]); return; }
    const fetchSubs = async () => {
      const { data: cat } = await supabase.from("categories").select("id").eq("name_fr", categoryFilter).single();
      if (!cat) { setSubcategories([]); return; }
      const { data } = await supabase.from("subcategories").select("id, name_fr").eq("category_id", cat.id).order("name_fr");
      setSubcategories(data || []);
    };
    fetchSubs();
  }, [categoryFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, cityFilter, statusFilter, categoryFilter, subcategoryFilter, badgeFilter]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      const matchesSearch = !searchQuery || (() => {
        const q = searchQuery.toLowerCase();
        return b.name.toLowerCase().includes(q) ||
          (b.city?.toLowerCase().includes(q)) ||
          (b.main_category?.toLowerCase().includes(q)) ||
          (b.hook_fr?.toLowerCase().includes(q)) ||
          (b.description?.toLowerCase().includes(q)) ||
          (b.keywords?.some(k => k.toLowerCase().includes(q)));
      })();
      const matchesCity = cityFilter === "all" || b.city === cityFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? b.is_active : !b.is_active);
      const matchesCategory = categoryFilter === "all" || b.main_category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === "all" || (b.categories?.includes(subcategoryFilter));
      const matchesBadge = !badgeFilter || businessBadges.some(bb => bb.business_id === b.id && bb.badge_id === badgeFilter);
      return matchesSearch && matchesCity && matchesStatus && matchesCategory && matchesSubcategory && matchesBadge;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [businesses, searchQuery, cityFilter, statusFilter, categoryFilter, subcategoryFilter, badgeFilter, businessBadges]);

  const toggleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Sort after filter
  const sortedBusinesses = useMemo(() => {
    if (!sortColumn) return filteredBusinesses;
    const dir = sortDirection === "asc" ? 1 : -1;

    const getVal = (b: Business): string | number => {
      switch (sortColumn) {
        case "name": return b.name.toLowerCase();
        case "city": return (b.city || "").toLowerCase() + " " + (b.neighborhood || "").toLowerCase();
        case "active": return b.is_active ? 1 : 0;
        case "engagements": return b.engagements?.length || 0;
        case "badges": return getBadgesForBusiness(b.id).length;
        case "destinations": return getDestsForBusiness(b.id).length;
        case "gps": return (b.latitude != null && b.longitude != null) ? 1 : 0;
        case "certifications": return getLabelsForBusiness(b.id).length;
        default: return "";
      }
    };

    return [...filteredBusinesses].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredBusinesses, sortColumn, sortDirection, businessBadges, businessDestinations, businessLabels]);

  const totalPages = Math.max(1, Math.ceil(sortedBusinesses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBusinesses = sortedBusinesses.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  // Lookup maps
  const badgeMap = useMemo(() => new Map(badges.map(b => [b.id, b])), [badges]);
  const destMap = useMemo(() => new Map(destinations.map(d => [d.id, d])), [destinations]);
  const labelMap = useMemo(() => new Map(labels.map(l => [l.id, l])), [labels]);

  const getBadgesForBusiness = (businessId: string) => {
    return businessBadges
      .filter(bb => bb.business_id === businessId)
      .map(bb => ({ ...badgeMap.get(bb.badge_id)!, is_default: bb.is_default }))
      .filter(b => b.name_fr);
  };

  const getDestsForBusiness = (businessId: string) => {
    return businessDestinations
      .filter(bd => bd.business_id === businessId)
      .map(bd => destMap.get(bd.destination_id))
      .filter(Boolean) as DestRow[];
  };

  const getLabelsForBusiness = (businessId: string) => {
    return businessLabels
      .filter(bl => bl.business_id === businessId)
      .map(bl => labelMap.get(bl.label_id))
      .filter(Boolean) as LabelRow[];
  };

  if (loading) {
    return (
      <div className="bg-background rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto"></div>
        <p className="text-muted-foreground mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-background rounded-lg border p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, hook, description, mots-clés..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {uniqueCities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subcategories.length > 0 && (
            <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sous-catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes sous-catégories</SelectItem>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.name_fr}>{sub.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {/* Badge filter */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-sm text-muted-foreground self-center mr-1">Badges :</span>
            {badges.map(badge => (
              <button
                key={badge.id}
                type="button"
                onClick={() => setBadgeFilter(badgeFilter === badge.id ? null : badge.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  badgeFilter === badge.id ? "ring-2 ring-offset-1 ring-primary scale-105" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor: badge.color_hex || '#666666',
                  color: badge.text_color_hex || '#000000',
                  borderColor: badgeFilter === badge.id ? 'transparent' : '#00000030',
                }}
              >
                {badge.name_fr}
              </button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">{filteredBusinesses.length} résultat(s)</p>
      </div>

      {/* Table */}
      <TooltipProvider>
        <div className="bg-background rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center">Nom<SortIcon col="name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("city")}>
                    <span className="inline-flex items-center">Ville / Quartier<SortIcon col="city" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("active")}>
                    <span className="inline-flex items-center">Actif<SortIcon col="active" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("engagements")}>
                    <span className="inline-flex items-center">Engagements<SortIcon col="engagements" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("badges")}>
                    <span className="inline-flex items-center">Badges<SortIcon col="badges" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("destinations")}>
                    <span className="inline-flex items-center">Destinations<SortIcon col="destinations" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("gps")}>
                    <span className="inline-flex items-center">GPS<SortIcon col="gps" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("certifications")}>
                    <span className="inline-flex items-center">Certifications<SortIcon col="certifications" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBusinesses.map((business) => {
                  const bBadges = getBadgesForBusiness(business.id);
                  const bDests = getDestsForBusiness(business.id);
                  const bLabels = getLabelsForBusiness(business.id);
                  const hasGPS = business.latitude != null && business.longitude != null;

                  return (
                    <TableRow key={business.id}>
                      {/* Edit */}
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

                      {/* Name + links */}
                      <TableCell>
                        <span className="font-medium">{business.name}</span>
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
                            href={`/business/${business.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Fiche <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>

                      {/* City + Neighborhood */}
                      <TableCell>
                        <div>{business.city || "-"}</div>
                        {business.neighborhood && (
                          <div className="text-sm text-muted-foreground">{business.neighborhood}</div>
                        )}
                      </TableCell>

                      {/* Active */}
                      <TableCell>
                        <Badge
                          variant={business.is_active ? "default" : "secondary"}
                          className={
                            business.is_active
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          }
                        >
                          {business.is_active ? "Oui" : "Non"}
                        </Badge>
                      </TableCell>

                      {/* Engagements */}
                      <TableCell>
                        {(() => {
                          const cleanLabel = (s: string) => s.replace(/^(Logistique:|Certification:|Marché:)/, "");
                          const items = business.engagements?.filter(e => e.length > 0) || [];
                          if (items.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {items.slice(0, 3).map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">
                                  {cleanLabel(s)}
                                </Badge>
                              ))}
                              {items.length > 3 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs font-normal cursor-help">
                                      +{items.length - 3}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs">{items.slice(3).map(cleanLabel).join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Badges */}
                      <TableCell>
                        {bBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bBadges.map((badge, i) => (
                              <Badge
                                key={i}
                                className="text-xs border border-black gap-1"
                                style={{
                                  backgroundColor: badge.color_hex || '#666666',
                                  color: badge.text_color_hex || '#000000',
                                }}
                              >
                                {badge.is_default && <Star className="h-3 w-3 fill-current" />}
                                {badge.name_fr}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>

                      {/* Destinations */}
                      <TableCell>
                        {bDests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bDests.map((d, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">
                                {d.name_fr}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>

                      {/* GPS */}
                      <TableCell>
                        {hasGPS ? (
                          <a
                            href={business.google_maps_url || `https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          >
                            <Navigation className="h-4 w-4" />
                          </a>
                        ) : (
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/10 text-red-600">
                            <Navigation className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>

                      {/* Certifications (labels) */}
                      <TableCell>
                        {bLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bLabels.map((l, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal">
                                {l.name_fr}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {safeCurrentPage} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(safeCurrentPage - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(safeCurrentPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default BusinessOverviewTab;
