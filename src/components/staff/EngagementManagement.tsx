import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onEditBusiness?: (id: string) => void;
}

interface GlobalOptions {
  certifications: string[];
  engagements: string[];
  commodites: string[];
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
  const [searchQueries, setSearchQueries] = useState<Record<SectionType, string>>({ engagements: "", certifications: "", commodites: "" });
  // Business usage counts
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);

    const [optionsRes, bizRes] = await Promise.all([
      supabase.from("staff_notes").select("content").eq("key", "engagement_custom_options_v1").maybeSingle(),
      supabase.from("businesses").select("engagements").not("engagements", "eq", "{}"),
    ]);

    // Parse global options
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

    // Also collect unique values from actual businesses to ensure completeness
    const counts: Record<string, number> = {};
    const bizCerts = new Set<string>();
    const bizEngs = new Set<string>();
    const bizComms = new Set<string>();

    for (const b of bizRes.data || []) {
      for (const e of b.engagements || []) {
        counts[e] = (counts[e] || 0) + 1;
        if (e.startsWith("Certification:")) bizCerts.add(e.replace("Certification:", ""));
        else if (e.startsWith("Logistique:")) bizComms.add(e.replace("Logistique:", ""));
        else if (!e.startsWith("Marché:")) bizEngs.add(e);
      }
    }

    // Merge: global options + values found in businesses
    opts.certifications = [...new Set([...opts.certifications, ...bizCerts])].sort((a, b) => a.localeCompare(b, "fr"));
    opts.engagements = [...new Set([...opts.engagements, ...bizEngs])].sort((a, b) => a.localeCompare(b, "fr"));
    opts.commodites = [...new Set([...opts.commodites, ...bizComms])].sort((a, b) => a.localeCompare(b, "fr"));

    setGlobalOptions(opts);
    setUsageCounts(counts);
    setLoading(false);
    setLoaded(true);
  };

  useEffect(() => {
    if (mainOpen && !loaded) fetchData();
  }, [mainOpen]);

  const persistOptions = async (next: GlobalOptions) => {
    setSaving(true);
    const content = JSON.stringify(next);
    const { data: existing } = await supabase
      .from("staff_notes")
      .select("id")
      .eq("key", "engagement_custom_options_v1")
      .maybeSingle();

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

  const handleDelete = (type: SectionType, item: string) => {
    const config = SECTION_CONFIG[type];
    const rawKey = config.prefix + item;
    const count = usageCounts[rawKey] || 0;

    if (count > 0) {
      toast(`« ${item} » est utilisé par ${count} établissement${count > 1 ? "s" : ""}. Supprimer quand même ?`, {
        action: {
          label: "Oui, supprimer",
          onClick: async () => {
            const next = { ...globalOptions, [type]: globalOptions[type].filter((i) => i !== item) };
            await persistOptions(next);
            toast.success(`« ${item} » supprimé du référentiel`);
          },
        },
        cancel: { label: "Annuler", onClick: () => {} },
        duration: 10000,
      });
    } else {
      (async () => {
        const next = { ...globalOptions, [type]: globalOptions[type].filter((i) => i !== item) };
        await persistOptions(next);
        toast.success(`« ${item} » supprimé`);
      })();
    }
  };

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
    const q = searchQueries[type].toLowerCase();
    const filtered = q ? items.filter((i) => i.toLowerCase().includes(q)) : items;

    return (
      <div key={type} className="space-y-3">
        <Button variant="outline" className="w-full justify-between" onClick={() => toggleSection(type)}>
          <span className="font-medium">{config.emoji} {config.label} ({items.length})</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {isOpen && (
          <div className="space-y-3 pl-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher…"
                  value={searchQueries[type]}
                  onChange={(e) => setSearchQueries((prev) => ({ ...prev, [type]: e.target.value }))}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>

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
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">
                        {q ? "Aucun résultat" : "Aucun élément"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
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
                            <span className={`text-sm ${count > 0 ? "font-medium" : "text-muted-foreground"}`}>{count}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(type, item)}
                              disabled={saving}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
    <div className="space-y-4 mt-10 pt-10 border-t">
      <Button variant="outline" className="w-full justify-between" onClick={() => setMainOpen(!mainOpen)}>
        <span className="font-semibold">Certifications, Engagements & Commodités ({loaded ? totalCount : "…"})</span>
        {mainOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {mainOpen && (
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
      )}
    </div>
  );
};

export default EngagementManagement;
