import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, ArrowLeft, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";
import LogoUploader from "./LogoUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  logo_url: string | null;
  type: string | null;
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
  logo_url: "",
  type: "",
};

const EventManagement = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [kpInput, setKpInput] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [showNewType, setShowNewType] = useState(false);

  const fetchEventTypes = async () => {
    const { data } = await supabase.from("event_types").select("name").order("name");
    if (data) setEventTypes(data.map(d => (d as any).name));
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_date", { ascending: false });
    if (!error && data) setEvents(data as unknown as EventRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); fetchEventTypes(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setKpInput("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "instant" });
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
      logo_url: ev.logo_url || "",
      type: ev.type || "",
    });
    setKpInput("");
    setShowNewType(false);
    setNewTypeInput("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
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
      logo_url: form.logo_url || null,
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
      setShowForm(false);
      setEditingId(null);
      fetchEvents();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Événement supprimé" });
      fetchEvents();
    }
  };

  const addKp = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (form.kp_regroupement.length >= 20) {
      toast({ title: "Maximum 20 éléments", variant: "destructive" });
      return;
    }
    setForm(prev => ({ ...prev, kp_regroupement: [...prev.kp_regroupement, trimmed] }));
    setKpInput("");
  };

  const removeKp = (idx: number) => {
    setForm(prev => ({ ...prev, kp_regroupement: prev.kp_regroupement.filter((_, i) => i !== idx) }));
  };

  // ── FORM VIEW ──
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <h2 className="text-xl font-semibold">
            {editingId ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <Label>Hook</Label>
              <Input value={form.hook} onChange={e => setForm(p => ({ ...p, hook: e.target.value }))} />
            </div>

            {/* Dates + KP on same row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
              <div>
                <Label>KP Regroupement ({form.kp_regroupement.length}/20)</Label>
                <Input
                  placeholder="Code KP puis Entrée"
                  value={kpInput}
                  onChange={e => setKpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKp(kpInput); } }}
                />
              </div>
            </div>
            {form.kp_regroupement.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.kp_regroupement.map((kp, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-sm">
                    {kp}
                    <button type="button" onClick={() => removeKp(i)} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Description RichText - taller */}
            <div>
              <Label>Description</Label>
              <RichTextEditor
                content={form.description}
                onChange={html => setForm(p => ({ ...p, description: html }))}
                maxHeight="600px"
              />
            </div>
          </div>

          {/* Right column: Logo, Images & Videos */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Logo</Label>
              <LogoUploader
                logoUrl={form.logo_url}
                onChange={url => setForm(p => ({ ...p, logo_url: url }))}
              />
            </div>

            {/* Images */}
            <div>
              <Label className="text-base font-semibold">Images ({form.images.length}/10)</Label>
              <ImageUploader
                images={form.images}
                onChange={images => setForm(p => ({ ...p, images }))}
                maxImages={10}
              />
            </div>

            {/* Videos */}
            <div>
              <Label className="text-base font-semibold">Vidéos ({form.videos.length}/10)</Label>
              <div className="space-y-3">
                {form.videos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <VideoUploader
                        videoUrl={url}
                        onChange={newUrl => {
                          setForm(p => ({
                            ...p,
                            videos: p.videos.map((v, vi) => vi === i ? newUrl : v),
                          }));
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setForm(p => ({ ...p, videos: p.videos.filter((_, vi) => vi !== i) }))}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {form.videos.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setForm(p => ({ ...p, videos: [...p.videos, ""] }))}
                  >
                    <Plus className="h-4 w-4" /> Ajouter une vidéo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
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
              <TableHead className="w-10"></TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Hook</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>KP</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map(ev => (
              <TableRow key={ev.id}>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(ev)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{ev.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ev.hook}</TableCell>
                <TableCell className="text-sm">{ev.start_date || "—"}</TableCell>
                <TableCell className="text-sm">{ev.end_date || "—"}</TableCell>
                <TableCell className="text-sm">{ev.kp_regroupement?.length || 0}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          L'événement « {ev.name} » sera supprimé définitivement. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(ev.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default EventManagement;
