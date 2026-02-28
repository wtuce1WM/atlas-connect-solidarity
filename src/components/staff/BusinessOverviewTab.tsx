import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, ExternalLink, Star, MapPin, Navigation, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, Video, AlertTriangle } from "lucide-react";
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
  const [engagementFilter, setEngagementFilter] = useState<string | null>(null);
  const [destinationFilter, setDestinationFilter] = useState<string | null>(null);
  const [certificationFilter, setCertificationFilter] = useState<string | null>(null);
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
  const [serviceEditOptions, setServiceEditOptions] = useState<string[]>([]);
  const [serviceEditLoading, setServiceEditLoading] = useState(false);

  // Badge editor popup state
  const [badgeEditBusinessId, setBadgeEditBusinessId] = useState<string | null>(null);
  const [badgeEditBusinessName, setBadgeEditBusinessName] = useState("");
  const [badgeEditSelected, setBadgeEditSelected] = useState<{ badge_id: string; is_default: boolean }[]>([]);
  const [badgeEditSaving, setBadgeEditSaving] = useState(false);

  // Service editor popup state
  const [serviceEditBusinessId, setServiceEditBusinessId] = useState<string | null>(null);
  const [serviceEditBusinessName, setServiceEditBusinessName] = useState("");
  const [serviceEditSelected, setServiceEditSelected] = useState<string[]>([]);
  const [serviceEditDefault, setServiceEditDefault] = useState<string | null>(null);
  const [serviceEditSaving, setServiceEditSaving] = useState(false);

  // Destination editor popup state
  const [destEditBusinessId, setDestEditBusinessId] = useState<string | null>(null);
  const [destEditBusinessName, setDestEditBusinessName] = useState("");
  const [destEditSelected, setDestEditSelected] = useState<string[]>([]);
  const [destEditSaving, setDestEditSaving] = useState(false);

  // Engagement editor popup state
  const [engEditBusinessId, setEngEditBusinessId] = useState<string | null>(null);
  const [engEditBusinessName, setEngEditBusinessName] = useState("");
  const [engEditSelected, setEngEditSelected] = useState<string[]>([]);
  const [engEditSaving, setEngEditSaving] = useState(false);

  // Certification editor popup state
  const [certEditBusinessId, setCertEditBusinessId] = useState<string | null>(null);
  const [certEditBusinessName, setCertEditBusinessName] = useState("");
  const [certEditSelected, setCertEditSelected] = useState<string[]>([]);
  const [certEditSaving, setCertEditSaving] = useState(false);

  // Video preview popup state
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewName, setVideoPreviewName] = useState("");
  const [brokenVideos, setBrokenVideos] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  // ---- Check broken videos ----
  useEffect(() => {
    const checkVideos = async () => {
      const withVideo = businesses.filter(b => b.video_1_url);
      const broken = new Set<string>();
      await Promise.allSettled(
        withVideo.map(async (b) => {
          try {
            const res = await fetch(b.video_1_url!, { method: "HEAD", mode: "no-cors" });
            // no-cors always returns opaque, so we can't truly check status
            // Instead try a regular fetch with a timeout
          } catch {
            broken.add(b.id);
          }
        })
      );
      // Use a more reliable approach: try loading via video element
      withVideo.forEach((b) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => { /* valid */ };
        video.onerror = () => {
          setBrokenVideos(prev => new Set([...prev, b.id]));
        };
        video.src = b.video_1_url!;
      });
    };
    if (businesses.length > 0) checkVideos();
  }, [businesses]);

  // ---- Refetch helpers ----
  const refetchBusinessBadges = useCallback(async () => {
    const { data } = await supabase.from("business_badges").select("business_id, badge_id, is_default");
    if (data) setBusinessBadges(data);
  }, []);

  const refetchBusinessDestinations = useCallback(async () => {
    const { data } = await supabase.from("business_destinations").select("business_id, destination_id");
    if (data) setBusinessDestinations(data);
  }, []);

  // ---- Badge editor ----
  const openBadgeEditor = (businessId: string, businessName: string) => {
    const current = businessBadges
      .filter(bb => bb.business_id === businessId)
      .map(bb => ({ badge_id: bb.badge_id, is_default: bb.is_default }));
    setBadgeEditSelected(current);
    setBadgeEditBusinessId(businessId);
    setBadgeEditBusinessName(businessName);
  };

  const toggleBadgeSelection = (badgeId: string) => {
    setBadgeEditSelected(prev => {
      const exists = prev.find(b => b.badge_id === badgeId);
      if (exists) return prev.filter(b => b.badge_id !== badgeId);
      return [...prev, { badge_id: badgeId, is_default: prev.length === 0 }];
    });
  };

  const toggleBadgeDefault = (badgeId: string) => {
    setBadgeEditSelected(prev =>
      prev.map(b => ({ ...b, is_default: b.badge_id === badgeId }))
    );
  };

  const saveBadgeEdit = async () => {
    if (!badgeEditBusinessId) return;
    setBadgeEditSaving(true);
    await supabase.from("business_badges").delete().eq("business_id", badgeEditBusinessId);
    if (badgeEditSelected.length > 0) {
      const rows = badgeEditSelected.map(b => ({
        business_id: badgeEditBusinessId,
        badge_id: b.badge_id,
        is_default: b.is_default,
      }));
      const { error } = await supabase.from("business_badges").insert(rows);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les badges." });
        setBadgeEditSaving(false);
        return;
      }
    }
    toast({ title: "Succès", description: "Badges mis à jour." });
    await refetchBusinessBadges();
    setBadgeEditBusinessId(null);
    setBadgeEditSaving(false);
  };

  // ---- Service editor ----
  const openServiceEditor = async (business: Business) => {
    setServiceEditSelected([...(business.services || [])]);
    setServiceEditDefault(business.default_service || null);
    setServiceEditBusinessId(business.id);
    setServiceEditBusinessName(business.name);
    setServiceEditLoading(true);
    setServiceEditOptions([]);

    // Fetch services belonging to this business's subcategories
    const subcatNames = business.categories || [];
    if (subcatNames.length > 0) {
      const { data: subs } = await supabase
        .from("subcategories")
        .select("id")
        .in("name_fr", subcatNames);
      if (subs && subs.length > 0) {
        const subIds = subs.map(s => s.id);
        const { data: svcs } = await supabase
          .from("services")
          .select("name_fr")
          .in("subcategory_id", subIds)
          .order("name_fr");
        if (svcs) {
          const names = [...new Set(svcs.map(s => s.name_fr))].sort((a, b) => a.localeCompare(b, 'fr'));
          setServiceEditOptions(names);
        }
      }
    }
    setServiceEditLoading(false);
  };

  const toggleServiceSelection = (svc: string) => {
    setServiceEditSelected(prev => {
      if (prev.includes(svc)) {
        const next = prev.filter(s => s !== svc);
        if (serviceEditDefault === svc) setServiceEditDefault(next[0] || null);
        return next;
      }
      return [...prev, svc];
    });
  };

  const saveServiceEdit = async () => {
    if (!serviceEditBusinessId) return;
    setServiceEditSaving(true);
    const { error } = await supabase.from("businesses").update({
      services: serviceEditSelected,
      default_service: serviceEditDefault,
    }).eq("id", serviceEditBusinessId);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les services." });
    } else {
      toast({ title: "Succès", description: "Services mis à jour." });
    }
    setServiceEditBusinessId(null);
    setServiceEditSaving(false);
  };

  // ---- Destination editor ----
  const openDestEditor = (businessId: string, businessName: string) => {
    const current = businessDestinations
      .filter(bd => bd.business_id === businessId)
      .map(bd => bd.destination_id);
    setDestEditSelected(current);
    setDestEditBusinessId(businessId);
    setDestEditBusinessName(businessName);
  };

  const toggleDestSelection = (destId: string) => {
    setDestEditSelected(prev =>
      prev.includes(destId) ? prev.filter(d => d !== destId) : [...prev, destId]
    );
  };

  const saveDestEdit = async () => {
    if (!destEditBusinessId) return;
    setDestEditSaving(true);
    await supabase.from("business_destinations").delete().eq("business_id", destEditBusinessId);
    if (destEditSelected.length > 0) {
      const rows = destEditSelected.map(d => ({
        business_id: destEditBusinessId,
        destination_id: d,
      }));
      const { error } = await supabase.from("business_destinations").insert(rows);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les destinations." });
        setDestEditSaving(false);
        return;
      }
    }
    toast({ title: "Succès", description: "Destinations mises à jour." });
    await refetchBusinessDestinations();
    setDestEditBusinessId(null);
    setDestEditSaving(false);
  };

  // ---- Engagement editor ----
  const openEngEditor = (business: Business) => {
    const currentEngs = (business.engagements || []).filter(e => e.length > 0 && !e.startsWith("Certification:"));
    setEngEditSelected(currentEngs);
    setEngEditBusinessId(business.id);
    setEngEditBusinessName(business.name);
  };

  const toggleEngSelection = (eng: string) => {
    setEngEditSelected(prev =>
      prev.includes(eng) ? prev.filter(e => e !== eng) : [...prev, eng]
    );
  };

  const saveEngEdit = async () => {
    if (!engEditBusinessId) return;
    setEngEditSaving(true);
    // Keep certifications intact
    const biz = businesses.find(b => b.id === engEditBusinessId);
    const certs = (biz?.engagements || []).filter(e => e.startsWith("Certification:"));
    const newEngagements = [...engEditSelected, ...certs];
    const { error } = await supabase.from("businesses").update({
      engagements: newEngagements,
    }).eq("id", engEditBusinessId);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les engagements." });
    } else {
      toast({ title: "Succès", description: "Engagements mis à jour." });
    }
    setEngEditBusinessId(null);
    setEngEditSaving(false);
  };

  // ---- Certification editor ----
  const openCertEditor = (business: Business) => {
    const currentCerts = (business.engagements || [])
      .filter(e => e.startsWith("Certification:"))
      .map(e => e.replace("Certification:", ""));
    setCertEditSelected(currentCerts);
    setCertEditBusinessId(business.id);
    setCertEditBusinessName(business.name);
  };

  const toggleCertSelection = (cert: string) => {
    setCertEditSelected(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  const saveCertEdit = async () => {
    if (!certEditBusinessId) return;
    setCertEditSaving(true);
    const biz = businesses.find(b => b.id === certEditBusinessId);
    const nonCerts = (biz?.engagements || []).filter(e => !e.startsWith("Certification:"));
    const newEngagements = [...nonCerts, ...certEditSelected.map(c => `Certification:${c}`)];
    const { error } = await supabase.from("businesses").update({
      engagements: newEngagements,
    }).eq("id", certEditBusinessId);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder les certifications." });
    } else {
      toast({ title: "Succès", description: "Certifications mises à jour." });
    }
    setCertEditBusinessId(null);
    setCertEditSaving(false);
  };

  // ---- Data fetch ----
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

  useEffect(() => { setCurrentPage(1); }, [searchQuery, cityFilter, statusFilter, categoryFilter, subcategoryFilter, badgeFilter, engagementFilter, destinationFilter, certificationFilter]);

  const uniqueEngagements = useMemo(() => {
    const set = new Set<string>();
    businesses.forEach(b => b.engagements?.filter(e => e.length > 0 && !e.startsWith("Certification:")).forEach(e => set.add(e)));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [businesses]);

  const uniqueCertifications = useMemo(() => {
    const set = new Set<string>();
    businesses.forEach(b => b.engagements?.filter(e => e.startsWith("Certification:")).forEach(e => set.add(e.replace("Certification:", ""))));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [businesses]);

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
      const matchesEngagement = !engagementFilter || b.engagements?.includes(engagementFilter);
      const matchesDestination = !destinationFilter || businessDestinations.some(bd => bd.business_id === b.id && bd.destination_id === destinationFilter);
      const matchesCertification = !certificationFilter || b.engagements?.includes(`Certification:${certificationFilter}`);
      return matchesSearch && matchesCity && matchesStatus && matchesCategory && matchesSubcategory && matchesBadge && matchesEngagement && matchesDestination && matchesCertification;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [businesses, searchQuery, cityFilter, statusFilter, categoryFilter, subcategoryFilter, badgeFilter, businessBadges, engagementFilter, destinationFilter, businessDestinations, certificationFilter]);

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

  const sortedBusinesses = useMemo(() => {
    if (!sortColumn) return filteredBusinesses;
    const dir = sortDirection === "asc" ? 1 : -1;

    const getVal = (b: Business): string | number => {
      switch (sortColumn) {
        case "name": return b.name.toLowerCase();
        case "city": return (b.city || "").toLowerCase() + " " + (b.neighborhood || "").toLowerCase();
        case "active": return b.is_active ? 1 : 0;
        case "engagements": return b.engagements?.length || 0;
        case "services": return b.services?.length || 0;
        case "badges": return getBadgesForBusiness(b.id).length;
        case "destinations": return getDestsForBusiness(b.id).length;
        case "gps": return (b.latitude != null && b.longitude != null) ? 1 : 0;
        case "video": return b.video_1_url ? (brokenVideos.has(b.id) ? 1 : 2) : 0;
        case "certifications": return (b.engagements?.filter(e => e.startsWith("Certification:")).length) || 0;
        
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
          <Collapsible defaultOpen={!!badgeFilter}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-3">
              <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]>svg]:rotate-180" />
              Filtrer par badge {badgeFilter && `(${badges.find(b => b.id === badgeFilter)?.name_fr})`}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-2 mt-2">
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
            </CollapsibleContent>
          </Collapsible>
        )}
        {/* Engagement filter */}
        {uniqueEngagements.length > 0 && (
          <Collapsible defaultOpen={!!engagementFilter}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-3">
              <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]>svg]:rotate-180" />
              Filtrer par engagement {engagementFilter && `(${engagementFilter.replace(/^(Logistique:|Marché:)/, "")})`}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-2 mt-2">
                {uniqueEngagements.map(eng => {
                  const cleanLabel = eng.replace(/^(Logistique:|Marché:)/, "");
                  return (
                    <button
                      key={eng}
                      type="button"
                      onClick={() => setEngagementFilter(engagementFilter === eng ? null : eng)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        engagementFilter === eng ? "ring-2 ring-offset-1 ring-primary scale-105 bg-primary/10 text-foreground" : "opacity-70 hover:opacity-100 bg-muted text-muted-foreground"
                      }`}
                    >
                      {cleanLabel}
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        {/* Destination filter */}
        {destinations.length > 0 && (
          <Collapsible defaultOpen={!!destinationFilter}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-3">
              <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]>svg]:rotate-180" />
              Filtrer par destination {destinationFilter && `(${destinations.find(d => d.id === destinationFilter)?.name_fr})`}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-2 mt-2">
                {destinations.map(dest => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => setDestinationFilter(destinationFilter === dest.id ? null : dest.id)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      destinationFilter === dest.id ? "ring-2 ring-offset-1 ring-primary scale-105 bg-primary/10 text-foreground" : "opacity-70 hover:opacity-100 bg-muted text-muted-foreground"
                    }`}
                  >
                    {dest.name_fr}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        {/* Certification filter */}
        {uniqueCertifications.length > 0 && (
          <Collapsible defaultOpen={!!certificationFilter}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-3">
              <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]>svg]:rotate-180" />
              Filtrer par certification {certificationFilter && `(${certificationFilter})`}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-2 mt-2">
                {uniqueCertifications.map(cert => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => setCertificationFilter(certificationFilter === cert ? null : cert)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      certificationFilter === cert ? "ring-2 ring-offset-1 ring-primary scale-105 bg-primary/10 text-foreground" : "opacity-70 hover:opacity-100 bg-muted text-muted-foreground"
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-muted-foreground">{filteredBusinesses.length} résultat(s)</p>
          {(searchQuery || cityFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || subcategoryFilter !== "all" || badgeFilter || engagementFilter || destinationFilter || certificationFilter) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => {
                setSearchQuery("");
                setCityFilter("all");
                setStatusFilter("all");
                setCategoryFilter("all");
                setSubcategoryFilter("all");
                setBadgeFilter(null);
                setEngagementFilter(null);
                setDestinationFilter(null);
                setCertificationFilter(null);
              }}
            >
              Effacer les filtres
            </Button>
          )}
        </div>
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("services")}>
                    <span className="inline-flex items-center">Services<SortIcon col="services" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("badges")}>
                    <span className="inline-flex items-center">Badges<SortIcon col="badges" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("destinations")}>
                    <span className="inline-flex items-center">Destinations<SortIcon col="destinations" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("engagements")}>
                    <span className="inline-flex items-center">Engagements<SortIcon col="engagements" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("certifications")}>
                    <span className="inline-flex items-center">Certifications<SortIcon col="certifications" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("video")}>
                    <span className="inline-flex items-center">Vidéo<SortIcon col="video" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("gps")}>
                    <span className="inline-flex items-center">GPS<SortIcon col="gps" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBusinesses.map((business) => {
                  const bBadges = getBadgesForBusiness(business.id);
                  const bDests = getDestsForBusiness(business.id);
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

                      {/* Services (clickable to edit) */}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openServiceEditor(business)}
                      >
                        {(() => {
                          const total = business.services?.length || 0;
                          const defaultSvc = business.default_service;
                          if (total === 0 && !defaultSvc) return <span className="text-muted-foreground text-sm hover:text-foreground">+ Ajouter</span>;
                          return (
                            <div className="flex flex-col gap-0.5 max-w-[150px]">
                              {defaultSvc && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="default" className="text-xs font-normal w-fit max-w-[140px] truncate block">
                                      {defaultSvc}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs">{defaultSvc}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {total > 0 && (
                                <span className="text-xs text-muted-foreground">{total} service{total > 1 ? "s" : ""}</span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Badges (clickable to edit) */}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openBadgeEditor(business.id, business.name)}
                      >
                        {bBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {bBadges.map((badge, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    className="text-xs border border-black gap-1 max-w-[140px] truncate"
                                    style={{
                                      backgroundColor: badge.color_hex || '#666666',
                                      color: badge.text_color_hex || '#000000',
                                    }}
                                  >
                                    {badge.is_default && <Star className="h-3 w-3 fill-current shrink-0" />}
                                    <span className="truncate">{badge.name_fr}</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">{badge.name_fr}</p></TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm hover:text-foreground">+ Ajouter</span>
                        )}
                      </TableCell>

                      {/* Destinations (clickable to edit) */}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDestEditor(business.id, business.name)}
                      >
                        {bDests.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {bDests.map((d, i) => (
                              <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs font-normal max-w-[140px] truncate">
                                    {d.name_fr}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p className="text-xs">{d.name_fr}</p></TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm hover:text-foreground">+ Ajouter</span>
                        )}
                      </TableCell>

                      {/* Engagements (clickable to edit) */}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEngEditor(business)}
                      >
                        {(() => {
                          const cleanLabel = (s: string) => s.replace(/^(Logistique:|Certification:|Marché:)/, "");
                          const items = business.engagements?.filter(e => e.length > 0 && !e.startsWith("Certification:")) || [];
                          if (items.length === 0) return <span className="text-muted-foreground text-sm hover:text-foreground">+ Ajouter</span>;
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {items.slice(0, 3).map((s, i) => (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs font-normal max-w-[140px] truncate">
                                      {cleanLabel(s)}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p className="text-xs">{cleanLabel(s)}</p></TooltipContent>
                                </Tooltip>
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

                      {/* Certifications (clickable to edit) */}
                      <TableCell
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openCertEditor(business)}
                      >
                        {(() => {
                          const certs = business.engagements?.filter(e => e.startsWith("Certification:")).map(e => e.replace("Certification:", "")) || [];
                          if (certs.length === 0) return <span className="text-muted-foreground text-sm hover:text-foreground">+ Ajouter</span>;
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {certs.map((c, i) => (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs font-normal max-w-[140px] truncate">
                                      {c}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p className="text-xs">{c}</p></TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Vidéo */}
                      <TableCell>
                        {business.video_1_url ? (
                          brokenVideos.has(business.id) ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-500/10 text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p className="text-xs">Vidéo cassée</p></TooltipContent>
                            </Tooltip>
                          ) : (
                            <button
                              onClick={() => { setVideoPreviewUrl(business.video_1_url!); setVideoPreviewName(business.name); }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20"
                            >
                              <Video className="h-4 w-4" />
                            </button>
                          )
                        ) : (
                          <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground">
                            <Video className="h-4 w-4" />
                          </div>
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

        {/* Badge editor dialog */}
        <Dialog open={badgeEditBusinessId !== null} onOpenChange={(open) => { if (!open) setBadgeEditBusinessId(null); }}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-lg">Badges — {badgeEditBusinessName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {badges.map(badge => {
                const isSelected = badgeEditSelected.some(b => b.badge_id === badge.id);
                const isDefault = badgeEditSelected.find(b => b.badge_id === badge.id)?.is_default || false;
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleBadgeSelection(badge.id)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleBadgeSelection(badge.id)} className="h-3.5 w-3.5" />
                    <Badge
                      className="text-xs border border-black shrink-0"
                      style={{
                        backgroundColor: badge.color_hex || '#666666',
                        color: badge.text_color_hex || '#000000',
                      }}
                    >
                      {badge.name_fr}
                    </Badge>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleBadgeDefault(badge.id); }}
                        className={`p-0.5 rounded ${isDefault ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400'}`}
                        title={isDefault ? "Badge par défaut" : "Définir comme défaut"}
                      >
                        <Star className={`h-3.5 w-3.5 ${isDefault ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>
                );
              })}
              {badges.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 w-full">Aucun badge disponible.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setBadgeEditBusinessId(null)}>Annuler</Button>
              <Button onClick={saveBadgeEdit} disabled={badgeEditSaving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {badgeEditSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Service editor dialog */}
        <Dialog open={serviceEditBusinessId !== null} onOpenChange={(open) => { if (!open) setServiceEditBusinessId(null); }}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-lg">Services — {serviceEditBusinessName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {serviceEditLoading && <p className="text-muted-foreground text-sm py-4 w-full text-center">Chargement...</p>}
              {serviceEditOptions.map(svc => {
                const isSelected = serviceEditSelected.includes(svc);
                const isDefault = serviceEditDefault === svc;
                return (
                  <div
                    key={svc}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleServiceSelection(svc)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleServiceSelection(svc)} className="h-3.5 w-3.5" />
                    <span className="text-xs">{svc}</span>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setServiceEditDefault(svc); }}
                        className={`p-0.5 rounded ${isDefault ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400'}`}
                        title={isDefault ? "Service par défaut" : "Définir comme défaut"}
                      >
                        <Star className={`h-3.5 w-3.5 ${isDefault ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>
                );
              })}
              {!serviceEditLoading && serviceEditOptions.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 w-full">Aucun service disponible pour ces sous-catégories.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setServiceEditBusinessId(null)}>Annuler</Button>
              <Button onClick={saveServiceEdit} disabled={serviceEditSaving}>
                {serviceEditSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Destination editor dialog */}
        <Dialog open={destEditBusinessId !== null} onOpenChange={(open) => { if (!open) setDestEditBusinessId(null); }}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-lg">Destinations — {destEditBusinessName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {destinations.map(dest => {
                const isSelected = destEditSelected.includes(dest.id);
                return (
                  <div
                    key={dest.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleDestSelection(dest.id)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleDestSelection(dest.id)} className="h-3.5 w-3.5" />
                    <span className="text-xs">{dest.name_fr}</span>
                  </div>
                );
              })}
              {destinations.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 w-full">Aucune destination disponible.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDestEditBusinessId(null)}>Annuler</Button>
              <Button onClick={saveDestEdit} disabled={destEditSaving}>
                {destEditSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Engagement editor dialog */}
        <Dialog open={engEditBusinessId !== null} onOpenChange={(open) => { if (!open) setEngEditBusinessId(null); }}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-lg">Engagements — {engEditBusinessName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {uniqueEngagements.map(eng => {
                const isSelected = engEditSelected.includes(eng);
                const cleanLabel = eng.replace(/^(Logistique:|Marché:)/, "");
                return (
                  <div
                    key={eng}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleEngSelection(eng)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleEngSelection(eng)} className="h-3.5 w-3.5" />
                    <span className="text-xs">{cleanLabel}</span>
                  </div>
                );
              })}
              {uniqueEngagements.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 w-full">Aucun engagement disponible.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEngEditBusinessId(null)}>Annuler</Button>
              <Button onClick={saveEngEdit} disabled={engEditSaving}>
                {engEditSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Certification editor dialog */}
        <Dialog open={certEditBusinessId !== null} onOpenChange={(open) => { if (!open) setCertEditBusinessId(null); }}>
          <DialogContent className="max-w-4xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-lg">Certifications — {certEditBusinessName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {uniqueCertifications.map(cert => {
                const isSelected = certEditSelected.includes(cert);
                return (
                  <div
                    key={cert}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => toggleCertSelection(cert)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleCertSelection(cert)} className="h-3.5 w-3.5" />
                    <span className="text-xs">{cert}</span>
                  </div>
                );
              })}
              {uniqueCertifications.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4 w-full">Aucune certification disponible.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setCertEditBusinessId(null)}>Annuler</Button>
              <Button onClick={saveCertEdit} disabled={certEditSaving}>
                {certEditSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Video preview dialog */}
        <Dialog open={videoPreviewUrl !== null} onOpenChange={(open) => { if (!open) setVideoPreviewUrl(null); }}>
          <DialogContent className="max-w-3xl w-[90vw]">
            <DialogHeader>
              <DialogTitle>Vidéo — {videoPreviewName}</DialogTitle>
            </DialogHeader>
            {videoPreviewUrl && (
              <video
                src={videoPreviewUrl}
                controls
                autoPlay
                className="w-full rounded-lg max-h-[70vh]"
              />
            )}
          </DialogContent>
        </Dialog>

      </TooltipProvider>
    </div>
  );
};

export default BusinessOverviewTab;
