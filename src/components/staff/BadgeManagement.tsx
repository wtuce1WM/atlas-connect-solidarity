import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { isInternalVideoUrl } from "@/lib/videoSourceFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Award } from "lucide-react";

interface BadgeBusiness {
  id: string;
  name: string;
  city: string;
  badge_id: string;
  is_default: boolean;
  sources: Array<"manual" | "primary">;
}

interface Subcategory {
  id: string;
  name_fr: string;
  category_name_fr?: string;
}

interface BadgeData {
  id: string;
  name_fr: string;
  name_en: string | null;
  name_ar: string | null;
  description: string | null;
  sort_order: number | null;
  color_hex: string | null;
  text_color_hex: string | null;
  is_active_on_front: boolean | null;
  qualify_business_from_youtube?: boolean | null;
}

interface BadgeSubcategory {
  badge_id: string;
  subcategory_id: string;
}

interface BadgeManagementProps {
  onEditBusiness?: (id: string) => void;
}

const BadgeManagement = ({ onEditBusiness }: BadgeManagementProps) => {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [badgeSubcategories, setBadgeSubcategories] = useState<BadgeSubcategory[]>([]);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [badgeVideoCounts, setBadgeVideoCounts] = useState<Record<string, number>>({});
  const [badgeBusinesses, setBadgeBusinesses] = useState<Record<string, BadgeBusiness[]>>({});
  const [expandedBadges, setExpandedBadges] = useState<Set<string>>(new Set());
  const badgeRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);
  const [formData, setFormData] = useState({
    name_fr: "", name_en: "", name_ar: "", description: "",
    sort_order: 0, color_hex: "#000000", text_color_hex: "#FFFFFF",
  });
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);

    const [
      badgesRes,
      subcatsRes,
      badgeSubcatsRes,
      businessBadgesRes,
      categoriesRes,
      businessesRes,
      businessVideoDocs,
      genericVideos,
      businessVideoBadgeLinks,
      genericVideoBadgeLinks,
    ] = await Promise.all([
      supabase.from("badges").select("*").order("name_fr", { ascending: true }),
      supabase.from("subcategories").select("id, name_fr, name_en, name_ar, category_id").order("name_fr"),
      supabase.from("badge_subcategories").select("badge_id, subcategory_id"),
      supabase.from("business_badges" as any).select("business_id, badge_id, is_default"),
      supabase.from("categories").select("id, name_fr"),
      supabase.from("businesses").select("id, name, city, badge_id, categories").eq("is_active", true),
      fetchAllRows<{ id: string; url: string | null }>("business_documents", "id, url", "created_at"),
      fetchAllRows<{ id: string; url: string | null }>("generic_videos", "id, url", "created_at"),
      fetchAllRows<{ document_id: string; badge_id: string }>("business_document_badges", "document_id, badge_id", "created_at"),
      fetchAllRows<{ generic_video_id: string; badge_id: string }>("generic_video_badges", "generic_video_id, badge_id", "created_at"),
    ]);

    if (badgesRes.error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les badges." });
    } else {
      setBadges(badgesRes.data || []);
    }

    const catMap = new Map((categoriesRes.data || []).map(c => [c.id, c.name_fr]));
    const subcatsRaw = (subcatsRes.data || []) as any[];
    const enrichedSubcats = subcatsRaw.map(sc => ({
      id: sc.id,
      name_fr: sc.name_fr,
      category_name_fr: catMap.get(sc.category_id) || "",
    }));
    setSubcategories(enrichedSubcats);
    setBadgeSubcategories(badgeSubcatsRes.data || []);

    const bbData = (businessBadgesRes.data || []) as any[];
    const allBusinesses = (businessesRes.data || []) as any[];
    const businessMap: Record<string, { id: string; name: string; city: string }> = {};
    allBusinesses.forEach((b: any) => {
      businessMap[b.id] = { id: b.id, name: b.name, city: b.city || "" };
    });

    const perBadge: Record<string, Map<string, { sources: Set<"manual" | "primary">; is_default: boolean }>> = {};
    const ensure = (badgeId: string, bizId: string) => {
      if (!perBadge[badgeId]) perBadge[badgeId] = new Map();
      if (!perBadge[badgeId].has(bizId)) perBadge[badgeId].set(bizId, { sources: new Set(), is_default: false });
      return perBadge[badgeId].get(bizId)!;
    };

    bbData.forEach((bb: any) => {
      if (!businessMap[bb.business_id]) return;
      const entry = ensure(bb.badge_id, bb.business_id);
      entry.sources.add("manual");
      if (bb.is_default) entry.is_default = true;
    });

    allBusinesses.forEach((b: any) => {
      if (!b.badge_id) return;
      ensure(b.badge_id, b.id).sources.add("primary");
    });

    const counts: Record<string, number> = {};
    const grouped: Record<string, BadgeBusiness[]> = {};
    Object.entries(perBadge).forEach(([badgeId, bizMap]) => {
      counts[badgeId] = bizMap.size;
      grouped[badgeId] = [...bizMap.entries()]
        .map(([bizId, info]) => {
          const biz = businessMap[bizId];
          return {
            id: bizId,
            name: biz?.name || "Inconnu",
            city: biz?.city || "",
            badge_id: badgeId,
            is_default: info.is_default,
            sources: [...info.sources],
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    });

    const internalBusinessVideoIds = new Set(
      (businessVideoDocs || []).filter((video) => isInternalVideoUrl(video.url)).map((video) => video.id)
    );
    const internalGenericVideoIds = new Set(
      (genericVideos || []).filter((video) => isInternalVideoUrl(video.url)).map((video) => video.id)
    );

    const videoCounts: Record<string, number> = {};
    (businessVideoBadgeLinks || []).forEach((link) => {
      if (!internalBusinessVideoIds.has(link.document_id)) return;
      videoCounts[link.badge_id] = (videoCounts[link.badge_id] || 0) + 1;
    });
    (genericVideoBadgeLinks || []).forEach((link) => {
      if (!internalGenericVideoIds.has(link.generic_video_id)) return;
      videoCounts[link.badge_id] = (videoCounts[link.badge_id] || 0) + 1;
    });

    setBadgeCounts(counts);
    setBadgeVideoCounts(videoCounts);
    setBadgeBusinesses(grouped);
    setLoading(false);
  };

  const getSubcategoriesForBadge = (badgeId: string): string[] =>
    badgeSubcategories.filter(bs => bs.badge_id === badgeId).map(bs => bs.subcategory_id);

  const getSubcategoryNames = (badgeId: string): string[] => {
    const ids = getSubcategoriesForBadge(badgeId);
    return subcategories.filter(sc => ids.includes(sc.id)).map(sc => sc.name_fr);
  };

  const resetForm = () => {
    setFormData({ name_fr: "", name_en: "", name_ar: "", description: "", sort_order: badges.length, color_hex: "#000000", text_color_hex: "#FFFFFF" });
    setSelectedSubcategories([]);
    setEditingBadge(null);
  };

  const handleOpenDialog = (badge?: BadgeData) => {
    if (badge) {
      setEditingBadge(badge);
      setFormData({
        name_fr: badge.name_fr, name_en: badge.name_en || "", name_ar: badge.name_ar || "",
        description: badge.description || "", sort_order: badge.sort_order || 0,
        color_hex: badge.color_hex || "#000000", text_color_hex: badge.text_color_hex || "#FFFFFF",
      });
      setSelectedSubcategories(getSubcategoriesForBadge(badge.id));
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubcategoryToggle = (subcategoryId: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategoryId) ? prev.filter(id => id !== subcategoryId) : [...prev, subcategoryId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_fr.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le nom en français est obligatoire." });
      return;
    }

    const badgeData = {
      name_fr: formData.name_fr.trim(),
      name_en: formData.name_en.trim() || null,
      name_ar: formData.name_ar.trim() || null,
      description: formData.description.trim() || null,
      sort_order: formData.sort_order,
      color_hex: formData.color_hex || null,
      text_color_hex: formData.text_color_hex || null,
    };

    let badgeId: string;

    if (editingBadge) {
      const { error } = await supabase.from("badges").update(badgeData).eq("id", editingBadge.id);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier le badge." });
        return;
      }
      badgeId = editingBadge.id;
      await supabase.from("badge_subcategories").delete().eq("badge_id", badgeId);
    } else {
      const { data, error } = await supabase.from("badges").insert(badgeData).select().single();
      if (error || !data) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer le badge." });
        return;
      }
      badgeId = data.id;
    }

    if (selectedSubcategories.length > 0) {
      const associations = selectedSubcategories.map(subcategoryId => ({
        badge_id: badgeId, subcategory_id: subcategoryId,
      }));
      const { error: assocError } = await supabase.from("badge_subcategories").insert(associations);
      if (assocError) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'associer les sous-catégories." });
        return;
      }
    }

    toast({ title: "Succès", description: editingBadge ? "Badge modifié avec succès." : "Badge créé avec succès." });
    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce badge ?")) return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le badge. Il est peut-être utilisé par des établissements." });
    } else {
      toast({ title: "Succès", description: "Badge supprimé avec succès." });
      fetchData();
    }
  };

  // Group subcategories by category
  const subcategoriesByCategory = subcategories.reduce<Record<string, Subcategory[]>>((acc, sc) => {
    const catName = sc.category_name_fr || "Sans catégorie";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(sc);
    return acc;
  }, {});

  const [sectionOpen, setSectionOpen] = useState(false);

  return (
    <Card className="mt-6">
      <CardHeader className="cursor-pointer select-none" onClick={() => setSectionOpen(!sectionOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges ({badges.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
          </CardTitle>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenDialog(); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau badge
          </Button>
        </div>
      </CardHeader>

      {sectionOpen && <CardContent>
        <div className="space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBadge ? "Modifier le badge" : "Nouveau badge"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="badge_name_fr">Nom (Français) *</Label>
                <Input id="badge_name_fr" value={formData.name_fr} onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })} placeholder="Ex: Spa & Bien-être" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge_name_en">Nom (Anglais)</Label>
                  <Input id="badge_name_en" value={formData.name_en} onChange={(e) => setFormData({ ...formData, name_en: e.target.value })} placeholder="Ex: Spa & Wellness" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_name_ar">Nom (Arabe)</Label>
                  <Input id="badge_name_ar" value={formData.name_ar} onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })} placeholder="سبا والرفاهية" dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_description">Description</Label>
                <Textarea id="badge_description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description du badge..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge_sort_order">Ordre d'affichage</Label>
                  <Input id="badge_sort_order" type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} min="0" className="w-24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color_hex">Couleur fond</Label>
                  <div className="flex items-center gap-2">
                    <Input id="badge_color_hex" type="color" value={formData.color_hex} onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input type="text" value={formData.color_hex} onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })} placeholder="#000000" className="w-28 font-mono text-sm" maxLength={7} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_text_color_hex">Couleur police</Label>
                  <div className="flex items-center gap-2">
                    <Input id="badge_text_color_hex" type="color" value={formData.text_color_hex} onChange={(e) => setFormData({ ...formData, text_color_hex: e.target.value })} className="w-12 h-10 p-1 cursor-pointer" />
                    <Input type="text" value={formData.text_color_hex} onChange={(e) => setFormData({ ...formData, text_color_hex: e.target.value })} placeholder="#FFFFFF" className="w-28 font-mono text-sm" maxLength={7} />
                  </div>
                </div>
              </div>

              {/* Badge preview */}
              <div className="space-y-2">
                <Label>Aperçu badge</Label>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs border border-black whitespace-nowrap" style={{ backgroundColor: formData.color_hex || '#000000', color: formData.text_color_hex || '#FFFFFF' }}>
                    {formData.name_fr || "Aperçu"}
                  </Badge>
                </div>
              </div>

              {/* Subcategories selection grouped by category */}
              <div className="space-y-3">
                <Label>Sous-catégories associées</Label>
                <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-3">
                  {Object.keys(subcategoriesByCategory).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Aucune sous-catégorie disponible</p>
                  ) : (
                    Object.entries(subcategoriesByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([catName, subcats]) => (
                      <div key={catName}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{catName}</p>
                        <div className="space-y-1 pl-2">
                          {subcats.map(sc => (
                            <div key={sc.id} className="flex items-center space-x-2">
                              <Checkbox id={`badge-sc-${sc.id}`} checked={selectedSubcategories.includes(sc.id)} onCheckedChange={() => handleSubcategoryToggle(sc.id)} />
                              <label htmlFor={`badge-sc-${sc.id}`} className="text-sm cursor-pointer">{sc.name_fr}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{selectedSubcategories.length} sous-catégorie(s) sélectionnée(s)</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" className="bg-gold hover:bg-gold/90">{editingBadge ? "Enregistrer" : "Créer"}</Button>
              </div>
            </form>
           </DialogContent>
        </Dialog>

      {/* Table */}
      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ordre</TableHead>
              <TableHead>Couleur</TableHead>
              <TableHead>Police</TableHead>
              <TableHead>Nom (FR)</TableHead>
              <TableHead>Nom (EN)</TableHead>
              <TableHead>Sous-catégories associées</TableHead>
              <TableHead className="text-center">Établissements</TableHead>
              <TableHead className="text-center">Vidéos</TableHead>
              <TableHead className="text-center">Activé sur le front</TableHead>
              <TableHead className="text-center">YouTube qualifie l'établissement</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">Chargement...</TableCell></TableRow>
            ) : badges.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">Aucun badge défini.</TableCell></TableRow>
            ) : (
              badges.map(badge => {
                const isExpanded = expandedBadges.has(badge.id);
                const count = badgeCounts[badge.id] || 0;
                const videoCount = badgeVideoCounts[badge.id] || 0;
                const businesses = badgeBusinesses[badge.id] || [];
                return (
                  <React.Fragment key={badge.id}>
                    <TableRow
                      ref={(el) => { badgeRefs.current[badge.id] = el; }}
                      style={{ scrollMarginTop: '80px' }}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        const wasExpanded = expandedBadges.has(badge.id);
                        setExpandedBadges(prev => {
                          const next = new Set(prev);
                          if (next.has(badge.id)) next.delete(badge.id); else next.add(badge.id);
                          return next;
                        });
                        if (!wasExpanded) {
                          setTimeout(() => badgeRefs.current[badge.id]?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                        }
                      }}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {count > 0 ? (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : <GripVertical className="h-4 w-4 text-muted-foreground" />}
                          {badge.sort_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: badge.color_hex || '#000000' }} title={badge.color_hex || '#000000'} />
                      </TableCell>
                      <TableCell>
                        <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-xs font-bold" style={{ backgroundColor: badge.text_color_hex || '#FFFFFF' }} title={badge.text_color_hex || '#FFFFFF'} />
                      </TableCell>
                      <TableCell className="font-medium">{badge.name_fr}</TableCell>
                      <TableCell>{badge.name_en || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getSubcategoryNames(badge.id).length > 0 ? (
                            getSubcategoryNames(badge.id).map(name => (
                              <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">Aucune</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{videoCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={!!badge.is_active_on_front}
                          onCheckedChange={async (checked) => {
                            const { error } = await supabase.from("badges").update({ is_active_on_front: checked }).eq("id", badge.id);
                            if (error) {
                              toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour." });
                            } else {
                              setBadges(prev => prev.map(b => b.id === badge.id ? { ...b, is_active_on_front: checked } : b));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={!!badge.qualify_business_from_youtube}
                          onCheckedChange={async (checked) => {
                            const { error } = await supabase.from("badges").update({ qualify_business_from_youtube: checked } as any).eq("id", badge.id);
                            if (error) {
                              toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour." });
                            } else {
                              setBadges(prev => prev.map(b => b.id === badge.id ? { ...b, qualify_business_from_youtube: checked } : b));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(badge)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(badge.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && businesses.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-muted/30 p-0">
                          <div className="px-8 py-3 space-y-1">
                            {businesses.map(b => (
                              <div key={b.id} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-background transition-colors">
                                <span className="text-sm flex items-center gap-2 flex-wrap">
                                  {b.is_default && <span className="text-amber-600" title="Badge par défaut">★</span>}
                                  <span>{b.name} <span className="text-muted-foreground">— {b.city}</span></span>
                                  {b.sources.includes("manual") && <Badge variant="outline" className="text-[10px] py-0 h-4">Manuel</Badge>}
                                  {b.sources.includes("primary") && <Badge variant="outline" className="text-[10px] py-0 h-4">Principal</Badge>}
                                  
                                </span>
                                {onEditBusiness && (
                                  <Button variant="ghost" size="sm" onClick={() => onEditBusiness(b.id)} className="h-7 text-xs gap-1">
                                    <Edit className="h-3 w-3" /> Modifier
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
           </TableBody>
        </Table>
        </div>
        </div>
      </CardContent>}
    </Card>
  );
};

export default BadgeManagement;
