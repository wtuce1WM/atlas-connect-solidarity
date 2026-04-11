import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, CalendarDays, Save, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventRow {
  id: string;
  name: string;
  hook: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  images: string[];
  videos: string[];
  kp_regroupement: string[];
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = {
  name: "",
  hook: "",
  description: "",
  start_date: "",
  end_date: "",
  images: [] as string[],
  videos: [] as string[],
  kp_regroupement: [] as string[],
};

const EventManagement = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // temp inputs for array fields
  const [imageInput, setImageInput] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [kpInput, setKpInput] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });
    if (!error && data) setEvents(data as unknown as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setImageInput("");
    setVideoInput("");
    setKpInput("");
    setDialogOpen(true);
  };

  const openEdit = (ev: EventRow) => {
    setEditingId(ev.id);
    setForm({
      name: ev.name,
      hook: ev.hook || "",
      description: ev.description || "",
      start_date: ev.start_date || "",
      end_date: ev.end_date || "",
      images: ev.images || [],
      videos: ev.videos || [],
      kp_regroupement: ev.kp_regroupement || [],
    });
    setImageInput("");
    setVideoInput("");
    setKpInput("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Le nom est requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      hook: form.hook.trim() || null,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      images: form.images,
      videos: form.videos,
      kp_regroupement: form.kp_regroupement,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("events").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("events").insert(payload));
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Événement mis à jour" : "Événement créé" });
      setDialogOpen(false);
      fetchEvents();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Événement supprimé" });
      fetchEvents();
    }
  };

  const addToArray = (field: "images" | "videos" | "kp_regroupement", value: string, max: number) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (form[field].length >= max) {
      toast({ title: `Maximum ${max} éléments`, variant: "destructive" });
      return;
    }
    setForm(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
  };

  const removeFromArray = (field: "images" | "videos" | "kp_regroupement", idx: number) => {
    setForm(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Events</h2>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nouvel événement
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Aucun événement.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Hook</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>KP</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map(ev => (
              <TableRow key={ev.id}>
                <TableCell className="font-medium">{ev.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.hook}</TableCell>
                <TableCell className="text-sm">{ev.start_date || "—"}</TableCell>
                <TableCell className="text-sm">{ev.end_date || "—"}</TableCell>
                <TableCell className="text-sm">{ev.kp_regroupement?.length || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(ev.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            {/* Hook */}
            <div>
              <Label>Hook</Label>
              <Textarea value={form.hook} onChange={e => setForm(p => ({ ...p, hook: e.target.value }))} rows={2} />
            </div>

            {/* Description RichText */}
            <div>
              <Label>Description</Label>
              <RichTextEditor
                content={form.description}
                onChange={html => setForm(p => ({ ...p, description: html }))}
                placeholder="Description de l'événement..."
                maxHeight="300px"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            {/* Images (max 10) */}
            <div>
              <Label>Images ({form.images.length}/10)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="URL de l'image"
                  value={imageInput}
                  onChange={e => setImageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToArray("images", imageInput, 10); setImageInput(""); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => { addToArray("images", imageInput, 10); setImageInput(""); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeFromArray("images", i)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos (max 10) */}
            <div>
              <Label>Vidéos ({form.videos.length}/10)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="URL de la vidéo"
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToArray("videos", videoInput, 10); setVideoInput(""); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => { addToArray("videos", videoInput, 10); setVideoInput(""); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.videos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.videos.map((url, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="truncate flex-1 text-muted-foreground">{url}</span>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromArray("videos", i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* KP Regroupement (max 20) */}
            <div>
              <Label>KP Regroupement ({form.kp_regroupement.length}/20)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Code KP"
                  value={kpInput}
                  onChange={e => setKpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addToArray("kp_regroupement", kpInput, 20); setKpInput(""); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => { addToArray("kp_regroupement", kpInput, 20); setKpInput(""); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.kp_regroupement.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.kp_regroupement.map((kp, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-sm">
                      {kp}
                      <button type="button" onClick={() => removeFromArray("kp_regroupement", i)} className="text-muted-foreground hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManagement;
