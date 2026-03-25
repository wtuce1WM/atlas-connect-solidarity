import { useState, useEffect, useMemo } from "react";
import { businessUrl } from "@/lib/businessUrl";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Plus, Loader2, Eye, ExternalLink, ShieldCheck, Settings2 } from "lucide-react";
import CertificationMetadataDialog from "./CertificationMetadataDialog";
import { toast } from "sonner";

interface Props {
  onEditBusiness?: (id: string) => void;
}

interface GlobalOptions {
  certifications: string[];
  engagements: string[];
  commodites: string[];
}

interface BusinessMini {
  id: string;
  name: string;
  city: string | null;
  is_active: boolean;
}

type SectionType = "engagements" | "certifications" | "commodites";

const SECTION_CONFIG: Record<SectionType, { label: string; emoji: string; badgeClass: string; prefix: string }> = {
  certifications: { label: "Certifications", emoji: "🏅", badgeClass: "border-blue-400 text-blue-700 dark:text-blue-300", prefix: "Certification:" },
  engagements: { label: "Engagements", emoji: "", badgeClass: "", prefix: "" },
  commodites: { label: "Commodités", emoji: "📦", badgeClass: "border-orange-400 text-orange-700 dark:text-orange-300", prefix: "Logistique:" },
};

const EngagementManagement = ({ onEditBusiness }: Props) => {
  const [globalOptions, setGlobalOptions] = useState<GlobalOptions>({ certifications: [], engagements: [], commodites: [] });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mainOpen, setMainOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionType>>(new Set());
  const [newItems, setNewItems] = useState<Record<SectionType, string>>({ engagements: "", certifications: "", commodites: "" });
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  // All businesses with engagements for popup
  const [allBusinesses, setAllBusinesses] = useState<{ id: string; name: string; city: string | null; is_active: boolean; engagements: string[] }[]>([]);

  // Popup state
  const [popup, setPopup] = useState<{ title: string; businesses: BusinessMini[]; loading: boolean } | null>(null);
  const [popupCityFilter, setPopupCityFilter] = useState<string>("all");
  const [editingCert, setEditingCert] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const [optionsRes, bizRes] = await Promise.all([
      supabase.from("staff_notes").select("content").eq("key", "engagement_custom_options_v1").maybeSingle(),
      supabase.from("businesses").select("id, name, city, is_active, engagements").not("engagements", "eq", "{}").order("name"),
    ]);

    let opts: GlobalOptions = { certifications: [], engagements: [], commodites: [] };
    if (optionsRes.data?.content) {
      try {
        const parsed = JSON.parse(optionsRes.data.content);
        opts = {
          certifications: Array.isArray(parsed?.certifications) ? parsed.certifications.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
          engagements: Array.isArray(parsed?.engagements) ? parsed.engagements.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
          commodites: Array.isArray(parsed?.commodites) ? parsed.commodites.filter((v: unknown) => typeof v === "string" && v.trim()) : [],
        };
      } catch { /* ignore */ }
    }

    const counts: Record<string, number> = {};
    const bizCerts = new Set<string>();
    const bizEngs = new Set<string>();
    const bizComms = new Set<string>();
    const bizData = bizRes.data || [];

    for (const b of bizData) {
      for (const e of b.engagements || []) {
        counts[e] = (counts[e] || 0) + 1;
        if (e.startsWith("Certification:")) bizCerts.add(e.replace("Certification:", ""));
        else if (e.startsWith("Logistique:")) bizComms.add(e.replace("Logistique:", ""));
        else if (!e.startsWith("Marché:")) bizEngs.add(e);
      }
    }

    opts.certifications = [...new Set([...opts.certifications, ...bizCerts])].sort((a, b) => a.localeCompare(b, "fr"));
    opts.engagements = [...new Set([...opts.engagements, ...bizEngs])].sort((a, b) => a.localeCompare(b, "fr"));
    opts.commodites = [...new Set([...opts.commodites, ...bizComms])].sort((a, b) => a.localeCompare(b, "fr"));

    setGlobalOptions(opts);
    setUsageCounts(counts);
    setAllBusinesses(bizData.map((b) => ({ id: b.id, name: b.name, city: b.city, is_active: b.is_active, engagements: b.engagements || [] })));
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (mainOpen && !loaded) fetchData();
  }, [mainOpen]);

  const persistOptions = async (next: GlobalOptions) => {
    setSaving(true);
    const content = JSON.stringify(next);
    const { data: existing } = await supabase.from("staff_notes").select("id").eq("key", "engagement_custom_options_v1").maybeSingle();
    if (existing) {
      await supabase.from("staff_notes").update({ content, updated_at: new Date().toISOString() }).eq("key", "engagement_custom_options_v1");
    } else {
      await supabase.from("staff_notes").insert({ key: "engagement_custom_options_v1", content });
    }
    setGlobalOptions(next);
    setSaving(false);
  };

  const handleAdd = async (type: SectionType) => {
    const val = newItems[type].trim();
    if (!val) return;
    if (globalOptions[type].includes(val)) {
      toast.warning("Cet élément existe déjà");
      return;
    }
    const next = { ...globalOptions, [type]: [...globalOptions[type], val].sort((a, b) => a.localeCompare(b, "fr")) };
    await persistOptions(next);
    setNewItems((prev) => ({ ...prev, [type]: "" }));
    toast.success(`« ${val} » ajouté`);
  };


  const openBusinessesPopup = (item: string, rawKey: string) => {
    setPopupCityFilter("all");
    const matched = allBusinesses.filter((b) => b.engagements.includes(rawKey));
    setPopup({ title: item, businesses: matched.map((b) => ({ id: b.id, name: b.name, city: b.city, is_active: b.is_active })), loading: false });
  };

  const popupFilteredBusinesses = useMemo(() => {
    if (!popup) return [];
    return popupCityFilter === "all" ? popup.businesses : popup.businesses.filter((b) => b.city === popupCityFilter);
  }, [popup, popupCityFilter]);

  const popupCities = useMemo(() => {
    if (!popup) return [];
    return [...new Set(popup.businesses.map((b) => b.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "fr"));
  }, [popup]);

  const toggleSection = (type: SectionType) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const totalCount = globalOptions.certifications.length + globalOptions.engagements.length + globalOptions.commodites.length;

  const renderSection = (type: SectionType) => {
    const config = SECTION_CONFIG[type];
    const items = globalOptions[type];
    const isOpen = openSections.has(type);

    return (
      <div key={type} className="space-y-3">
        <Button variant="outline" className="w-full justify-between" onClick={() => toggleSection(type)}>
          <span className="font-medium">{config.emoji} {config.label} ({items.length})</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {isOpen && (
          <div className="space-y-3 pl-2">
            <div className="flex gap-2 items-center">
              <Input
                placeholder={`Nouveau ${config.label.toLowerCase().slice(0, -1)}…`}
                value={newItems[type]}
                onChange={(e) => setNewItems((prev) => ({ ...prev, [type]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd(type);
                  }
                }}
                className="h-8 text-sm flex-1"
                disabled={saving}
              />
              <Button size="sm" variant="outline" className="h-8 px-3 text-sm" onClick={() => handleAdd(type)} disabled={saving || !newItems[type].trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Créer
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-center w-[100px]">Utilisations</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-6 text-sm">
                        Aucun élément
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const rawKey = config.prefix + item;
                      const count = usageCounts[rawKey] || 0;
                      return (
                        <TableRow key={item}>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${config.badgeClass}`}>
                              {config.emoji && `${config.emoji} `}{item}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant={count > 0 ? "outline" : "ghost"}
                              size="sm"
                              className="gap-1.5"
                              disabled={count === 0}
                              onClick={() => openBusinessesPopup(item, rawKey)}
                            >
                              <Eye className="h-3.5 w-3.5" /> {count}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="cursor-pointer select-none" onClick={() => setMainOpen(!mainOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Certifications, Engagements & Commodités ({loaded ? totalCount : "…"})
              <ChevronDown className={`h-4 w-4 transition-transform ${mainOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </div>
        </CardHeader>

        {mainOpen && <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {renderSection("certifications")}
                {renderSection("engagements")}
                {renderSection("commodites")}
              </>
            )}
          </div>
        </CardContent>}
      </Card>

      {/* Businesses popup */}
      <Dialog open={!!popup} onOpenChange={(open) => { if (!open) setPopup(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Établissements — {popup?.title}</DialogTitle>
          </DialogHeader>
          {popup?.loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {popupCities.length > 1 && (
                <Select value={popupCityFilter} onValueChange={setPopupCityFilter}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Toutes les villes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les villes ({popup?.businesses.length})</SelectItem>
                    {popupCities.map((city) => (
                      <SelectItem key={city} value={city}>{city} ({popup?.businesses.filter((b) => b.city === city).length})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-sm text-muted-foreground">{popupFilteredBusinesses.length} établissement{popupFilteredBusinesses.length !== 1 ? "s" : ""}</p>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popupFilteredBusinesses.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.city || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-200 text-black hover:bg-green-300" : ""}>
                            {b.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Link to={businessUrl(b)} target="_blank">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Voir"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          {onEditBusiness && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Éditer" onClick={() => { setPopup(null); onEditBusiness(b.id); }}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EngagementManagement;
