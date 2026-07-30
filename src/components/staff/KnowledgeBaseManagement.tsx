import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X, Search, BookOpen, ChevronDown, ChevronUp, Link2, MapPin, Upload, Loader2, ImageIcon } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface KnowledgeEntry {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string | null;
  notes: string | null;
  is_active: boolean;
  business_id: string | null;
  business_name?: string | null;
  city_id: string | null;
  city_name?: string | null;
  neighborhood_id: string | null;
  neighborhood_name?: string | null;
  destination_id: string | null;
  destination_name?: string | null;
  point_of_interest_id: string | null;
  poi_name?: string | null;
  external_urls_title?: string | null;
  external_urls?: ExternalUrl[];
}

interface ExternalUrl {
  name: string;
  logo_url: string;
  url: string;
  language: string;
}

interface KnowledgeBaseManagementProps {
  categories: string[];
  newEntryLabel?: string;
  emptyLabel?: string;
  showExternalUrls?: boolean;
}

/* ── Reusable autocomplete hook ── */
function useEntitySearch(table: string, nameCol: string) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setOptions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await (supabase
        .from(table as any)
        .select(`id, ${nameCol}`) as any)
        .ilike(nameCol, `%${query}%`)
        .limit(8);
      setOptions((data || []).map((r: any) => ({ id: r.id, label: r[nameCol] })));
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query, table, nameCol]);

  return { query, setQuery, options, open, setOpen };
}

/* ── Inline autocomplete component ── */
function EntityPicker({ label, emoji, selectedId, selectedLabel, onSelect, onClear, table, nameCol }: {
  label: string; emoji: string; selectedId: string | null; selectedLabel: string;
  onSelect: (id: string, label: string) => void; onClear: () => void;
  table: string; nameCol: string;
}) {
  const { query, setQuery, options, open, setOpen } = useEntitySearch(table, nameCol);

  useEffect(() => { if (selectedLabel) setQuery(selectedLabel); }, [selectedLabel]);

  return (
    <div className="relative flex-1 min-w-[180px]">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{emoji} {label}</label>
      <div className="flex gap-1 items-center">
        <div className="relative flex-1">
          <Input
            placeholder={`Rechercher…`}
            value={query}
            onChange={e => { setQuery(e.target.value); onClear(); }}
            onFocus={() => options.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="h-8 text-sm"
          />
          {open && options.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {options.map(o => (
                <button key={o.id} className="w-full text-left px-3 py-1.5 hover:bg-muted text-sm"
                  onMouseDown={e => { e.preventDefault(); onSelect(o.id, o.label); setQuery(o.label); setOpen(false); }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedId && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onClear(); setQuery(""); }}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {selectedId && <p className="text-xs text-green-600 mt-0.5">✓ {query}</p>}
    </div>
  );
}

const KnowledgeBaseManagement = ({
  categories,
  newEntryLabel = "Nouvelle entrée",
  emptyLabel = "Aucune entrée trouvée",
  showExternalUrls = false,
}: KnowledgeBaseManagementProps) => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0] || "general");
  const [formTags, setFormTags] = useState("");
  const [formSource, setFormSource] = useState("manual");
  const [formNotes, setFormNotes] = useState("");
  // Linking
  const [formBusinessId, setFormBusinessId] = useState<string | null>(null);
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOptions, setBusinessOptions] = useState<{ id: string; name: string; city: string | null; is_active: boolean }[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [formCityId, setFormCityId] = useState<string | null>(null);
  const [formCityLabel, setFormCityLabel] = useState("");
  const [formNeighborhoodId, setFormNeighborhoodId] = useState<string | null>(null);
  const [formNeighborhoodLabel, setFormNeighborhoodLabel] = useState("");
  const [formDestinationId, setFormDestinationId] = useState<string | null>(null);
  const [formDestinationLabel, setFormDestinationLabel] = useState("");
  const [formPoiId, setFormPoiId] = useState<string | null>(null);
  const [formPoiLabel, setFormPoiLabel] = useState("");
  const [formExternalUrlsTitle, setFormExternalUrlsTitle] = useState("");
  const [formExternalUrlsSectionTitle, setFormExternalUrlsSectionTitle] = useState("");
  const [formExternalUrls, setFormExternalUrls] = useState<ExternalUrl[]>([]);

  // Search businesses for linking
  useEffect(() => {
    if (businessSearch.length < 2) { setBusinessOptions([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city, is_active")
        .ilike("name", `%${businessSearch}%`)
        .limit(8);
      setBusinessOptions(data || []);
      setShowBusinessDropdown(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [businessSearch]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .in("category", categories)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les entrées." });
    } else {
      const rows = (data as any[]) || [];
      // Resolve linked entity names in parallel
      const bizIds = rows.map(e => e.business_id).filter(Boolean);
      const cityIds = rows.map(e => e.city_id).filter(Boolean);
      const nhIds = rows.map(e => e.neighborhood_id).filter(Boolean);
      const destIds = rows.map(e => e.destination_id).filter(Boolean);
      const poiIds = rows.map(e => e.point_of_interest_id).filter(Boolean);

      const [bizRes, cityRes, nhRes, destRes, poiRes] = await Promise.all([
        bizIds.length ? supabase.from("businesses").select("id, name").in("id", bizIds) : { data: [] },
        cityIds.length ? supabase.from("cities").select("id, name_fr").in("id", cityIds) : { data: [] },
        nhIds.length ? supabase.from("neighborhoods").select("id, name").in("id", nhIds) : { data: [] },
        destIds.length ? supabase.from("destinations").select("id, name_fr").in("id", destIds) : { data: [] },
        poiIds.length ? supabase.from("points_of_interest").select("id, name_fr").in("id", poiIds) : { data: [] },
      ]);

      const bizMap = new Map((bizRes.data || []).map((b: any) => [b.id, b.name]));
      const cityMap = new Map((cityRes.data || []).map((c: any) => [c.id, c.name_fr]));
      const nhMap = new Map((nhRes.data || []).map((n: any) => [n.id, n.name]));
      const destMap = new Map((destRes.data || []).map((d: any) => [d.id, d.name_fr]));
      const poiMap = new Map((poiRes.data || []).map((p: any) => [p.id, p.name_fr]));

      rows.forEach(e => {
        e.business_name = e.business_id ? bizMap.get(e.business_id) || null : null;
        e.city_name = e.city_id ? cityMap.get(e.city_id) || null : null;
        e.neighborhood_name = e.neighborhood_id ? nhMap.get(e.neighborhood_id) || null : null;
        e.destination_name = e.destination_id ? destMap.get(e.destination_id) || null : null;
        e.poi_name = e.point_of_interest_id ? poiMap.get(e.point_of_interest_id) || null : null;
      });
      setEntries(rows as KnowledgeEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const resetForm = () => {
    setFormTitle(""); setFormContent(""); setFormCategory(categories[0] || "general");
    setFormTags(""); setFormSource("manual"); setFormNotes("");
    setFormBusinessId(null); setBusinessSearch("");
    setFormCityId(null); setFormCityLabel("");
    setFormNeighborhoodId(null); setFormNeighborhoodLabel("");
    setFormDestinationId(null); setFormDestinationLabel("");
    setFormPoiId(null); setFormPoiLabel("");
    setFormExternalUrlsTitle(""); setFormExternalUrlsSectionTitle(""); setFormExternalUrls([]);
    setEditingId(null); setShowNew(false);
  };

  const startEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setFormTitle(entry.title); setFormContent(entry.content);
    setFormCategory(entry.category); setFormTags(entry.tags.join(", "));
    setFormSource(entry.source || "manual"); setFormNotes(entry.notes || "");
    setFormBusinessId(entry.business_id); setBusinessSearch(entry.business_name || "");
    setFormCityId(entry.city_id); setFormCityLabel(entry.city_name || "");
    setFormNeighborhoodId(entry.neighborhood_id); setFormNeighborhoodLabel(entry.neighborhood_name || "");
    setFormDestinationId(entry.destination_id); setFormDestinationLabel(entry.destination_name || "");
    setFormPoiId(entry.point_of_interest_id); setFormPoiLabel(entry.poi_name || "");
    setFormExternalUrlsTitle((entry as any).external_urls_title || "");
    setFormExternalUrlsSectionTitle((entry as any).external_urls_section_title || "");
    setFormExternalUrls(entry.external_urls || []);
    setShowNew(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Le titre est requis." });
      return;
    }
    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      title: formTitle.trim(), content: formContent.trim(), category: formCategory,
      tags, source: formSource, notes: formNotes.trim() || null,
      business_id: formBusinessId || null,
      city_id: formCityId || null,
      neighborhood_id: formNeighborhoodId || null,
      destination_id: formDestinationId || null,
      point_of_interest_id: formPoiId || null,
      external_urls_section_title: formExternalUrlsSectionTitle.trim() || null,
      external_urls_title: formExternalUrlsTitle.trim() || null,
      external_urls: formExternalUrls.filter(u => u.name.trim() || u.url.trim()),
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("knowledge_entries").update(payload as any).eq("id", editingId);
      if (error) { toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour." }); return; }
      toast({ title: "Mis à jour", description: "Entrée modifiée avec succès." });
    } else {
      const { error } = await supabase.from("knowledge_entries").insert(payload as any);
      if (error) { toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer l'entrée." }); return; }
      toast({ title: "Créé", description: "Nouvelle entrée ajoutée." });
    }
    resetForm(); fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
    if (error) { toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer." }); }
    else { toast({ title: "Supprimé" }); fetchEntries(); }
  };

  const filtered = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !searchQuery ||
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q));
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchTag = tagFilter === "all" || e.tags.includes(tagFilter);
    return matchSearch && matchCat && matchTag;
  });

  const uniqueCategories = [...new Set(entries.map(e => e.category))].sort();
  const uniqueTags = [...new Set(entries.flatMap(e => e.tags || []))].sort();
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const isEditing = editingId || showNew;

  // Helper to render geo link badges
  const geoLinkBadge = (name: string | null | undefined, emoji: string) =>
    name ? <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200"><MapPin className="h-3 w-3 mr-1 inline" />{emoji} {name}</Badge> : null;

  return (
    <div className="space-y-6">
      {/* Form */}
      {isEditing && (
        <Card ref={formRef} className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{editingId ? "Modifier l'entrée" : newEntryLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Titre" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Tags (séparés par des virgules)" value={formTags} onChange={e => setFormTags(e.target.value)} />
              <Input placeholder="Source" value={formSource} onChange={e => setFormSource(e.target.value)} />
            </div>

            {/* Business link */}
            <div className="relative">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">🔗 Établissement lié (optionnel)</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    placeholder="Rechercher un établissement…"
                    value={businessSearch}
                    onChange={e => { setBusinessSearch(e.target.value); setFormBusinessId(null); }}
                    onFocus={() => businessOptions.length > 0 && setShowBusinessDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBusinessDropdown(false), 200)}
                  />
                  {showBusinessDropdown && businessOptions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {businessOptions.map(b => (
                        <button key={b.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onMouseDown={(e) => { e.preventDefault(); setFormBusinessId(b.id); setBusinessSearch(b.name); setShowBusinessDropdown(false); }}>
                          {b.name} {b.city && <span className="text-muted-foreground">— {b.city}</span>}
                          {!b.is_active && <span className="text-destructive ml-1 text-xs">(inactif)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formBusinessId && (
                  <Button variant="ghost" size="icon" onClick={() => { setFormBusinessId(null); setBusinessSearch(""); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {formBusinessId && <p className="text-xs text-green-600 mt-1">✓ Lié à : {businessSearch}</p>}
            </div>

            {/* Geo links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <EntityPicker label="Ville" emoji="🏙️" table="cities" nameCol="name_fr"
                selectedId={formCityId} selectedLabel={formCityLabel}
                onSelect={(id, label) => { setFormCityId(id); setFormCityLabel(label); }}
                onClear={() => { setFormCityId(null); setFormCityLabel(""); }} />
              <EntityPicker label="Quartier" emoji="📍" table="neighborhoods" nameCol="name"
                selectedId={formNeighborhoodId} selectedLabel={formNeighborhoodLabel}
                onSelect={(id, label) => { setFormNeighborhoodId(id); setFormNeighborhoodLabel(label); }}
                onClear={() => { setFormNeighborhoodId(null); setFormNeighborhoodLabel(""); }} />
              <EntityPicker label="Destination" emoji="🗺️" table="destinations" nameCol="name_fr"
                selectedId={formDestinationId} selectedLabel={formDestinationLabel}
                onSelect={(id, label) => { setFormDestinationId(id); setFormDestinationLabel(label); }}
                onClear={() => { setFormDestinationId(null); setFormDestinationLabel(""); }} />
              <EntityPicker label="Point d'intérêt" emoji="🏛️" table="points_of_interest" nameCol="name_fr"
                selectedId={formPoiId} selectedLabel={formPoiLabel}
                onSelect={(id, label) => { setFormPoiId(id); setFormPoiLabel(label); }}
                onClear={() => { setFormPoiId(null); setFormPoiLabel(""); }} />
            </div>

            <Textarea placeholder="Contenu" value={formContent} onChange={e => setFormContent(e.target.value)} rows={6} />

            {/* External URLs section */}
            {showExternalUrls && (
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🔗 URLs externes
                  </CardTitle>
                  <div className="space-y-2">
                    <Input
                      placeholder="Titre de la section URLs (ex: Sources officielles)"
                      value={formExternalUrlsSectionTitle}
                      onChange={e => setFormExternalUrlsSectionTitle(e.target.value.slice(0, 120))}
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">{formExternalUrlsSectionTitle.length} / 120 caractères</p>
                    <Input
                      placeholder="Hook de la section URLs (ex: Découvrez nos partenaires)"
                      value={formExternalUrlsTitle}
                      onChange={e => setFormExternalUrlsTitle(e.target.value.slice(0, 120))}
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">{formExternalUrlsTitle.length} / 120 caractères</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formExternalUrls.map((eu, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded-md">
                      <div className="flex-shrink-0">
                        {eu.logo_url ? (
                          <div className="relative w-10 h-10">
                            <img src={eu.logo_url} alt="" className="w-10 h-10 object-contain rounded border" />
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                              onClick={() => {
                                const updated = [...formExternalUrls];
                                updated[idx] = { ...updated[idx], logo_url: "" };
                                setFormExternalUrls(updated);
                              }}
                            >×</button>
                          </div>
                        ) : (
                          <label className="w-10 h-10 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) { toast({ variant: "destructive", title: "Max 2MB" }); return; }
                              const ext = file.name.split(".").pop();
                              const path = `knowledge/external-logos/${Date.now()}-${idx}.${ext}`;
                              const { error } = await supabase.storage.from("business-images").upload(path, file);
                              if (error) { toast({ variant: "destructive", title: "Erreur upload" }); return; }
                              const { data: urlData } = supabase.storage.from("business-images").getPublicUrl(path);
                              if (urlData?.publicUrl) {
                                const updated = [...formExternalUrls];
                                updated[idx] = { ...updated[idx], logo_url: urlData.publicUrl };
                                setFormExternalUrls(updated);
                              }
                            }} />
                          </label>
                        )}
                      </div>
                      <Input
                        placeholder="Nom"
                        value={eu.name}
                        onChange={e => {
                          const updated = [...formExternalUrls];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setFormExternalUrls(updated);
                        }}
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        placeholder="URL"
                        value={eu.url}
                        onChange={e => {
                          const updated = [...formExternalUrls];
                          updated[idx] = { ...updated[idx], url: e.target.value };
                          setFormExternalUrls(updated);
                        }}
                        className="h-8 text-sm flex-1"
                      />
                      <Select value={eu.language || "fr"} onValueChange={val => {
                        const updated = [...formExternalUrls];
                        updated[idx] = { ...updated[idx], language: val };
                        setFormExternalUrls(updated);
                      }}>
                        <SelectTrigger className="h-8 w-[70px] text-xs flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">AR</SelectItem>
                          <SelectItem value="ar-std">AR std</SelectItem>
                          <SelectItem value="fr">FR</SelectItem>
                          <SelectItem value="en">EN</SelectItem>
                          <SelectItem value="es">ES</SelectItem>
                          <SelectItem value="de">DE</SelectItem>
                          <SelectItem value="it">IT</SelectItem>
                          <SelectItem value="pt">PT</SelectItem>
                          <SelectItem value="nl">NL</SelectItem>
                          <SelectItem value="zh">ZH</SelectItem>
                          <SelectItem value="ja">JA</SelectItem>
                          <SelectItem value="ru">RU</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => {
                        setFormExternalUrls(prev => prev.filter((_, i) => i !== idx));
                      }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {formExternalUrls.length < 20 && (
                    <Button variant="outline" size="sm" onClick={() => setFormExternalUrls(prev => [...prev, { name: "", logo_url: "", url: "", language: "fr" }])}>
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter une URL ({formExternalUrls.length}/20)
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">📝 Notes personnelles</label>
              <RichTextEditor content={formNotes} onChange={setFormNotes} placeholder="Liens sources, observations…" maxHeight="300px" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
              <Button variant="outline" onClick={resetForm}><X className="h-4 w-4 mr-2" />Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-3">
          {categories.length > 1 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tag" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tags</SelectItem>
              {uniqueTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {!isEditing && (
          <Button className="shrink-0" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />{newEntryLabel}</Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">
        Ces entrées enrichissent les réponses du concierge IA. Les entrées liées à un établissement sont utilisées par l'IA pour contextualiser ses réponses, mais ne s'affichent pas sur la fiche de l'établissement.
      </p>

      {/* Stats */}
      <p className="text-sm text-muted-foreground">{filtered.length} entrée{filtered.length !== 1 ? "s" : ""}</p>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{emptyLabel}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <Card key={entry.id} className={`${editingId === entry.id ? "border-primary" : ""} ${!entry.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm">{entry.title}</h3>
                      <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                      {entry.source && <Badge variant="secondary" className="text-xs">{entry.source}</Badge>}
                      {entry.business_name && <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"><Link2 className="h-3 w-3 mr-1 inline" />{entry.business_name}</Badge>}
                      {geoLinkBadge(entry.city_name, "🏙️")}
                      {geoLinkBadge(entry.neighborhood_name, "📍")}
                      {geoLinkBadge(entry.destination_name, "🗺️")}
                      {geoLinkBadge(entry.poi_name, "🏛️")}
                      {!entry.is_active && <Badge variant="destructive" className="text-xs">Désactivé</Badge>}
                      {entry.external_urls && entry.external_urls.length > 0 && (
                        <Badge variant="outline" className="text-xs">🔗 {entry.external_urls.length} URL{entry.external_urls.length > 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                    <div className={`text-sm text-muted-foreground prose prose-sm max-w-none ${expandedIds.has(entry.id) ? '' : 'line-clamp-3'}`} dangerouslySetInnerHTML={{ __html: entry.content }} />
                    {entry.notes && (
                      <div className={`text-xs text-muted-foreground/70 italic mt-1 prose prose-xs max-w-none ${expandedIds.has(entry.id) ? '' : 'line-clamp-2'}`} dangerouslySetInnerHTML={{ __html: `📝 ${entry.notes}` }} />
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-muted">{tag}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(entry.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 items-center">
                    <Button variant="ghost" size="icon" onClick={() => toggleExpand(entry.id)} title={expandedIds.has(entry.id) ? "Réduire" : "Déplier"}>
                      {expandedIds.has(entry.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <button
                      onClick={async () => {
                        const newVal = !entry.is_active;
                        const { error } = await supabase.from("knowledge_entries").update({ is_active: newVal }).eq("id", entry.id);
                        if (error) { toast({ variant: "destructive", title: "Erreur" }); return; }
                        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_active: newVal } : e));
                        toast({ title: newVal ? "Activé" : "Désactivé" });
                      }}
                      className={`text-xs px-2 py-1 rounded transition-colors ${entry.is_active ? "text-green-700 bg-green-100 hover:bg-green-200" : "text-red-700 bg-red-100 hover:bg-red-200"}`}
                    >
                      {entry.is_active ? "Actif" : "Inactif"}
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(entry)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManagement;
