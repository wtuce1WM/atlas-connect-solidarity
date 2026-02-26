import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Save, X, Search, BookOpen } from "lucide-react";

interface KnowledgeEntry {
  id: string;
  created_at: string;
  updated_at: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  source: string | null;
}

const CATEGORIES = [
  "general",
  "search-engine",
  "voice-search",
  "opening-hours",
  "UI",
  "architecture",
  "business-rules",
  "bug-fix",
];

const KnowledgeBaseManagement = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");
  const [formSource, setFormSource] = useState("manual");

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les entrées." });
    } else {
      setEntries((data as KnowledgeEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormTags("");
    setFormSource("manual");
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
            <CardTitle className="text-lg">{editingId ? "Modifier l'entrée" : "Nouvelle entrée"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Titre" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Tags (séparés par des virgules)" value={formTags} onChange={e => setFormTags(e.target.value)} />
              <Input placeholder="Source" value={formSource} onChange={e => setFormSource(e.target.value)} />
            </div>
            <Textarea placeholder="Contenu" value={formContent} onChange={e => setFormContent(e.target.value)} rows={6} />
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isEditing && (
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nouvelle entrée</Button>
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
          <p>Aucune entrée trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <Card key={entry.id} className={editingId === entry.id ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm">{entry.title}</h3>
                      <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                      {entry.source && <Badge variant="secondary" className="text-xs">{entry.source}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {entry.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-muted">{tag}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(entry.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
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
