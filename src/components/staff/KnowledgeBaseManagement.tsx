import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X, Search, BookOpen, ChevronDown, ChevronUp, Link2 } from "lucide-react";
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
}

interface KnowledgeBaseManagementProps {
  /** Which categories to show / allow creating */
  categories: string[];
  /** Label for new entry button */
  newEntryLabel?: string;
  /** Empty state label */
  emptyLabel?: string;
}

const KnowledgeBaseManagement = ({
  categories,
  newEntryLabel = "Nouvelle entrée",
  emptyLabel = "Aucune entrée trouvée",
}: KnowledgeBaseManagementProps) => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
  const [formBusinessId, setFormBusinessId] = useState<string | null>(null);
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOptions, setBusinessOptions] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  // Search businesses for linking
  useEffect(() => {
    if (businessSearch.length < 2) { setBusinessOptions([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city")
        .ilike("name", `%${businessSearch}%`)
        .eq("is_active", true)
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
      const entries = (data as any[]) || [];
      // Fetch linked business names
      const bizIds = entries.map(e => e.business_id).filter(Boolean);
      if (bizIds.length > 0) {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", bizIds);
        const bizMap = new Map((bizData || []).map((b: any) => [b.id, b.name]));
        entries.forEach(e => { e.business_name = e.business_id ? bizMap.get(e.business_id) || null : null; });
      }
      setEntries(entries as KnowledgeEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory(categories[0] || "general");
    setFormTags("");
    setFormSource("manual");
    setFormNotes("");
    setFormBusinessId(null);
    setBusinessSearch("");
    setEditingId(null);
    setShowNew(false);
  };

  const startEdit = (entry: KnowledgeEntry) => {
    setEditingId(entry.id);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormCategory(entry.category);
    setFormTags(entry.tags.join(", "));
    setFormSource(entry.source || "manual");
    setFormNotes(entry.notes || "");
    setFormBusinessId(entry.business_id);
    setBusinessSearch(entry.business_name || "");
    setShowNew(false);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Titre et contenu requis." });
      return;
    }

    const tags = formTags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      tags,
      source: formSource,
      notes: formNotes.trim() || null,
      business_id: formBusinessId || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("knowledge_entries").update(payload).eq("id", editingId);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour." });
        return;
      }
      toast({ title: "Mis à jour", description: "Entrée modifiée avec succès." });
    } else {
      const { error } = await supabase.from("knowledge_entries").insert(payload);
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer l'entrée." });
        return;
      }
      toast({ title: "Créé", description: "Nouvelle entrée ajoutée." });
    }

    resetForm();
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from("knowledge_entries").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer." });
    } else {
      toast({ title: "Supprimé" });
      fetchEntries();
    }
  };

  const filtered = entries.filter(e => {
    const matchSearch = !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const uniqueCategories = [...new Set(entries.map(e => e.category))].sort();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const isEditing = editingId || showNew;

  return (
    <div className="space-y-6">
      {/* Form */}
      {isEditing && (
        <Card className="border-primary/30">
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
                        <button
                          key={b.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onMouseDown={(e) => { e.preventDefault(); setFormBusinessId(b.id); setBusinessSearch(b.name); setShowBusinessDropdown(false); }}
                        >
                          {b.name} {b.city && <span className="text-muted-foreground">— {b.city}</span>}
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
            <Textarea placeholder="Contenu" value={formContent} onChange={e => setFormContent(e.target.value)} rows={6} />
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {!isEditing && (
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />{newEntryLabel}</Button>
        )}
      </div>

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
                      {entry.business_name && <Badge variant="secondary" className="text-xs"><Link2 className="h-3 w-3 mr-1 inline" />{entry.business_name}</Badge>}
                      {!entry.is_active && <Badge variant="destructive" className="text-xs">Désactivé</Badge>}
                    </div>
                    <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${expandedIds.has(entry.id) ? '' : 'line-clamp-3'}`}>{entry.content}</p>
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
