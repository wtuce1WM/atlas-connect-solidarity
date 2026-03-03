import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Search, Eye, ExternalLink, Loader2, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BusinessEngagement {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
  engagements: string[];
}

type EngagementType = "engagement" | "certification" | "commodite";

const PREFIX_MAP: Record<EngagementType, string> = {
  engagement: "",
  certification: "Certification:",
  commodite: "Logistique:",
};

function parseEngagements(engagements: string[]) {
  const certifications: string[] = [];
  const commodites: string[] = [];
  const plain: string[] = [];
  for (const e of engagements) {
    if (e.startsWith("Certification:")) certifications.push(e.replace("Certification:", ""));
    else if (e.startsWith("Logistique:")) commodites.push(e.replace("Logistique:", ""));
    else if (!e.startsWith("Marché:")) plain.push(e);
  }
  return { certifications, commodites, engagements: plain };
}

interface Props {
  onEditBusiness?: (id: string) => void;
}

const EngagementManagement = ({ onEditBusiness }: Props) => {
  const [sectionOpen, setSectionOpen] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessEngagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [filterType, setFilterType] = useState<"all" | EngagementType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [addType, setAddType] = useState<EngagementType>("engagement");
  const [saving, setSaving] = useState(false);

  const fetchBusinesses = async () => {
    setLoading(true);
    // Fetch all businesses that have at least one engagement
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, city, is_active, engagements")
      .order("name");

    if (error) {
      toast.error("Erreur de chargement");
      setLoading(false);
      return;
    }

    setBusinesses(
      (data || [])
        .filter((b) => b.engagements && b.engagements.length > 0)
        .map((b) => ({
          id: b.id,
          name: b.name,
          city: b.city,
          is_active: b.is_active,
          engagements: b.engagements || [],
        }))
    );
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (sectionOpen && !loaded) fetchBusinesses();
  }, [sectionOpen]);

  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    const q = searchQuery.trim().toLowerCase();

    if (filterType !== "all" || q) {
      result = result.filter((b) => {
        const parsed = parseEngagements(b.engagements);
        let items: string[] = [];
        if (filterType === "all") items = [...parsed.engagements, ...parsed.certifications, ...parsed.commodites];
        else if (filterType === "engagement") items = parsed.engagements;
        else if (filterType === "certification") items = parsed.certifications;
        else if (filterType === "commodite") items = parsed.commodites;

        if (q) {
          const nameMatch = b.name.toLowerCase().includes(q);
          const itemMatch = items.some((i) => i.toLowerCase().includes(q));
          return nameMatch || itemMatch;
        }
        return items.length > 0;
      });
    }
    return result;
  }, [businesses, filterType, searchQuery]);

  const totalItems = useMemo(() => {
    let count = 0;
    for (const b of businesses) count += b.engagements.length;
    return count;
  }, [businesses]);

  const updateEngagements = async (businessId: string, newEngagements: string[]) => {
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ engagements: newEngagements, updated_at: new Date().toISOString() })
      .eq("id", businessId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return false;
    }
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, engagements: newEngagements } : b))
    );
    return true;
  };

  const handleDeleteItem = async (businessId: string, rawItem: string) => {
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) return;
    const success = await updateEngagements(businessId, biz.engagements.filter((e) => e !== rawItem));
    if (success) toast.success(`« ${rawItem} » supprimé`);
  };

  const handleDeleteAll = (businessId: string, businessName: string, count: number) => {
    toast(`Supprimer les ${count} éléments de « ${businessName} » ?`, {
      action: {
        label: "Oui, tout supprimer",
        onClick: async () => {
          const biz = businesses.find((b) => b.id === businessId);
          if (!biz) return;
          // Keep Marché: prefixed items
          const kept = biz.engagements.filter((e) => e.startsWith("Marché:"));
          const success = await updateEngagements(businessId, kept);
          if (success) toast.success("Tous les éléments supprimés");
        },
      },
      cancel: { label: "Annuler", onClick: () => {} },
      duration: 10000,
    });
  };

  const handleAddItem = async (businessId: string) => {
    const val = newItem.trim();
    if (!val) return;
    const biz = businesses.find((b) => b.id === businessId);
    if (!biz) return;
    const prefix = PREFIX_MAP[addType];
    const rawItem = prefix + val;
    if (biz.engagements.includes(rawItem)) {
      toast.warning("Cet élément existe déjà");
      return;
    }
    const success = await updateEngagements(businessId, [...biz.engagements, rawItem]);
    if (success) {
      setNewItem("");
      toast.success(`« ${rawItem} » ajouté`);
    }
  };

  const getBadgeStyle = (type: "engagement" | "certification" | "commodite") => {
    if (type === "certification") return "border-blue-400 text-blue-700 dark:text-blue-300";
    if (type === "commodite") return "border-orange-400 text-orange-700 dark:text-orange-300";
    return "";
  };

  return (
    <div className="space-y-4 mt-10 pt-10 border-t">
      <Button variant="outline" className="w-full justify-between" onClick={() => setSectionOpen(!sectionOpen)}>
        <span className="font-semibold">
          Certifications, Engagements & Commodités ({loaded ? `${businesses.length} établissements — ${totalItems} éléments` : "…"})
        </span>
        {sectionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {sectionOpen && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="engagement">Engagements</SelectItem>
                    <SelectItem value="certification">Certifications</SelectItem>
                    <SelectItem value="commodite">Commodités</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un établissement ou un élément…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {filteredBusinesses.length} établissement{filteredBusinesses.length !== 1 ? "s" : ""} affiché{filteredBusinesses.length !== 1 ? "s" : ""}
              </p>

              <div className="border rounded-lg max-h-[70vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Établissement</TableHead>
                      <TableHead>Éléments</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusinesses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Aucun résultat
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBusinesses.map((biz) => {
                        const parsed = parseEngagements(biz.engagements);
                        const isEditing = editingId === biz.id;
                        const displayableCount = parsed.engagements.length + parsed.certifications.length + parsed.commodites.length;

                        const renderBadges = (items: string[], type: EngagementType, prefix: string) =>
                          items.map((item) => {
                            const rawItem = prefix + item;
                            return (
                              <Badge
                                key={rawItem}
                                variant="outline"
                                className={`text-xs gap-1 ${getBadgeStyle(type)} ${isEditing ? "cursor-pointer hover:bg-destructive/20 hover:line-through transition-all" : ""}`}
                                onClick={isEditing ? () => handleDeleteItem(biz.id, rawItem) : undefined}
                                title={isEditing ? `Supprimer « ${item} »` : `${type === "certification" ? "Certification" : type === "commodite" ? "Commodité" : "Engagement"}`}
                              >
                                {type === "certification" && "🏅 "}
                                {type === "commodite" && "📦 "}
                                {item}
                                {isEditing && <X className="h-3 w-3 text-muted-foreground" />}
                              </Badge>
                            );
                          });

                        return (
                          <TableRow key={biz.id} className="align-top">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{biz.name}</p>
                                {biz.city && <p className="text-xs text-muted-foreground">{biz.city}</p>}
                                <div className="flex gap-1 mt-1">
                                  <Link to={`/business/${biz.id}`} target="_blank">
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                  {onEditBusiness && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditBusiness(biz.id)}>
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {renderBadges(parsed.certifications, "certification", "Certification:")}
                                  {renderBadges(parsed.engagements, "engagement", "")}
                                  {renderBadges(parsed.commodites, "commodite", "Logistique:")}
                                  {displayableCount === 0 && (
                                    <span className="text-xs text-muted-foreground italic">Aucun</span>
                                  )}
                                </div>
                                {isEditing && (
                                  <div className="space-y-2 pt-1 border-t border-border/50">
                                    {displayableCount > 0 && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleDeleteAll(biz.id, biz.name, displayableCount)}
                                        disabled={saving}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" /> Tout supprimer ({displayableCount})
                                      </Button>
                                    )}
                                    <div className="flex gap-1.5 items-center">
                                      <Select value={addType} onValueChange={(v) => setAddType(v as EngagementType)}>
                                        <SelectTrigger className="h-7 w-[130px] text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="engagement">Engagement</SelectItem>
                                          <SelectItem value="certification">Certification</SelectItem>
                                          <SelectItem value="commodite">Commodité</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        placeholder="Ajouter…"
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddItem(biz.id);
                                          }
                                        }}
                                        className="h-7 text-xs flex-1"
                                        disabled={saving}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleAddItem(biz.id)}
                                        disabled={saving || !newItem.trim()}
                                      >
                                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={isEditing ? "default" : "outline"}
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setEditingId(isEditing ? null : biz.id);
                                  setNewItem("");
                                }}
                              >
                                {isEditing ? "Fermer" : "Éditer"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EngagementManagement;
