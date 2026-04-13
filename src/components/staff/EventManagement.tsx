import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, ArrowLeft, X, Link, GripVertical, MapPinned, Search } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import RichTextEditor from "./RichTextEditor";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";
import LogoUploader from "./LogoUploader";
import { Switch } from "@/components/ui/switch";
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
  city_id: "",
  neighborhood_id: "",
  recurrence: "",
  google_maps_url: "",
  latitude: "" as string | number,
  longitude: "" as string | number,
  url: "",
  url_cta: "",
  url_force_external: false,
};

/* ── Sortable video item ── */
const SortableVideoItem = ({ id, url, index, setForm, toast }: { id: string; url: string; index: number; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; toast: any }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="space-y-1 w-64 shrink-0">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <VideoUploader
            compact
            videoUrl={url}
            onChange={newUrl => setForm(p => ({ ...p, videos: p.videos.map((v, vi) => vi === index ? newUrl : v) }))}
          />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setForm(p => ({ ...p, videos: p.videos.filter((_, vi) => vi !== index) }))}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {!url && (
        <div className="flex items-center gap-1 ml-8">
          <Link className="h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Coller l'ID vidéo (business_documents)"
            className="h-6 text-xs font-mono"
            onPaste={async (e) => {
              const pastedId = e.clipboardData.getData("text").trim();
              if (!pastedId || pastedId.length < 30) return;
              e.preventDefault();
              const { data } = await supabase.from("business_documents").select("url").eq("id", pastedId).eq("type", "video").maybeSingle();
              if ((data as any)?.url) {
                setForm(p => ({ ...p, videos: p.videos.map((v, vi) => vi === index ? (data as any).url : v) }));
                toast({ title: "Vidéo liée ✓", description: `URL récupérée depuis l'ID ${pastedId.substring(0, 8)}…` });
              } else {
                toast({ variant: "destructive", title: "ID introuvable", description: "Aucune vidéo trouvée avec cet identifiant." });
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ── Videos DnD list ── */
const VideosDndList = ({ form, setForm, toast }: { form: typeof EMPTY_FORM; setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>; toast: any }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const videoIds = form.videos.map((_, i) => `evt-vid-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = videoIds.indexOf(active.id as string);
    const newIndex = videoIds.indexOf(over.id as string);
    setForm(p => ({ ...p, videos: arrayMove(p.videos, oldIndex, newIndex) }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={videoIds} strategy={verticalListSortingStrategy}>
            {form.videos.map((url, i) => (
              <SortableVideoItem key={videoIds[i]} id={videoIds[i]} url={url} index={i} setForm={setForm} toast={toast} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {form.videos.length < 10 && (
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setForm(p => ({ ...p, videos: [...p.videos, ""] }))}>
          <Plus className="h-4 w-4" /> Ajouter une vidéo
        </Button>
      )}
    </div>
  );
};

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
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  url: string | null;
  url_cta: string | null;
  url_force_external: boolean;
  created_at: string;
  updated_at: string;
}

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
  const [cities, setCities] = useState<{ id: string; name_fr: string }[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string; city_id: string }[]>([]);
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

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("id, name_fr").order("name_fr");
    if (data) setCities(data);
  };

  const fetchNeighborhoods = async () => {
    const { data } = await supabase.from("neighborhoods").select("id, name, city_id").order("name");
    if (data) setNeighborhoods(data as any[]);
  };

  useEffect(() => { fetchEvents(); fetchEventTypes(); fetchCities(); fetchNeighborhoods(); }, []);

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
      city_id: (ev as any).city_id || "",
      neighborhood_id: (ev as any).neighborhood_id || "",
      recurrence: (ev as any).recurrence || "",
      google_maps_url: ev.google_maps_url || "",
      latitude: ev.latitude ?? "",
      longitude: ev.longitude ?? "",
      url: (ev as any).url || "",
      url_cta: (ev as any).url_cta || "",
      url_force_external: (ev as any).url_force_external ?? false,
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
      type: form.type || null,
      city_id: form.city_id || null,
      neighborhood_id: form.neighborhood_id || null,
      recurrence: form.recurrence || null,
      google_maps_url: form.google_maps_url || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      url: form.url || null,
      url_cta: form.url_cta || null,
      url_force_external: form.url_force_external,
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

  const addNewType = async () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("event_types").insert({ name: trimmed } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      await fetchEventTypes();
      setForm(p => ({ ...p, type: trimmed }));
      setNewTypeInput("");
      setShowNewType(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          {/* Left column: Nom, Type, Hook */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Type</Label>
                {showNewType ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nouveau type..."
                      value={newTypeInput}
                      onChange={e => setNewTypeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewType(); } }}
                    />
                    <Button size="sm" onClick={addNewType} className="shrink-0">OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNewType(false); setNewTypeInput(""); }} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Aucun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun</SelectItem>
                        {eventTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" onClick={() => setShowNewType(true)} title="Ajouter un type">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Ville</Label>
                <Select value={form.city_id || "__none__"} onValueChange={v => setForm(p => ({ ...p, city_id: v === "__none__" ? "" : v, neighborhood_id: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quartier</Label>
                <Select
                  value={form.neighborhood_id || "__none__"}
                  onValueChange={v => setForm(p => ({ ...p, neighborhood_id: v === "__none__" ? "" : v }))}
                  disabled={!form.city_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {neighborhoods
                      .filter(n => n.city_id === form.city_id)
                      .map(n => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Récurrence</Label>
                <Select value={form.recurrence || "__none__"} onValueChange={v => setForm(p => ({ ...p, recurrence: v === "__none__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    <SelectItem value="yearly">Tous les ans</SelectItem>
                    <SelectItem value="weekly">Une fois par semaine</SelectItem>
                    <SelectItem value="monthly">Une fois par mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Hook</Label>
              <Input value={form.hook} onChange={e => setForm(p => ({ ...p, hook: e.target.value }))} />
            </div>
          </div>

          {/* Right column: Logo */}
          <div className="space-y-2 w-48">
            <Label className="text-base font-semibold">Logo</Label>
            <LogoUploader
              logoUrl={form.logo_url}
              onChange={url => setForm(p => ({ ...p, logo_url: url }))}
            />
          </div>
        </div>

        {/* Full-width: Dates + KP */}
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

        {/* Full-width: Google Maps, Description, Images, Videos */}
        <div className="space-y-6">
          {/* Google Maps row */}
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-0">
              <Label className="flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-[#4285F4]" />
                {form.google_maps_url ? (
                  <a href={form.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                    Google Maps ↗
                  </a>
                ) : (
                  "Google Maps"
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={form.google_maps_url}
                  onChange={e => setForm(p => ({ ...p, google_maps_url: e.target.value }))}
                  onBlur={async (e) => {
                    const val = e.target.value?.trim();
                    if (!val || !val.includes("google") || (form.latitude && form.longitude)) return;
                    try {
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", { body: { url: val } });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        setForm(p => ({
                          ...p,
                          latitude: data.lat,
                          longitude: data.lng,
                          google_maps_url: data.resolvedUrl || p.google_maps_url,
                        }));
                        toast({ title: "GPS auto-détecté", description: `Lat: ${data.lat}, Lng: ${data.lng}` });
                      }
                    } catch { /* silent */ }
                  }}
                  placeholder="https://maps.google.com/..."
                  className="flex-1"
                />
                {form.google_maps_url && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm(p => ({ ...p, google_maps_url: "" }))} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-end shrink-0">
              <div className="space-y-1" style={{ width: '120px' }}>
                <Label className="text-xs">Lat</Label>
                <Input type="number" step="any" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} placeholder="31.6295" className="text-xs h-8" />
              </div>
              <div className="space-y-1" style={{ width: '120px' }}>
                <Label className="text-xs">Lng</Label>
                <Input type="number" step="any" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} placeholder="-7.9811" className="text-xs h-8" />
              </div>
              {form.google_maps_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs h-8 shrink-0"
                  onClick={async () => {
                    try {
                      toast({ title: "Résolution de l'URL...", description: "Extraction via Google Places API." });
                      const { data, error } = await supabase.functions.invoke("resolve-maps-url", { body: { url: form.google_maps_url } });
                      if (error) throw error;
                      if (data?.lat && data?.lng) {
                        setForm(p => ({
                          ...p,
                          latitude: data.lat,
                          longitude: data.lng,
                          google_maps_url: data.resolvedUrl || p.google_maps_url,
                        }));
                        toast({ title: "GPS récupéré", description: `Lat: ${data.lat}, Lng: ${data.lng}` });
                      } else {
                        toast({ variant: "destructive", title: "Impossible d'extraire les coordonnées" });
                      }
                    } catch (err: any) {
                      toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible de résoudre l'URL." });
                    }
                  }}
                >
                  <MapPinned className="h-3.5 w-3.5" />
                  GPS
                </Button>
              )}
            </div>
          </div>

          {/* URL + CTA + Toggle */}
          <div className="space-y-1">
            <Label>
              {form.url ? (
                <a href={form.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">URL ↗</a>
              ) : "URL"}
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.url_force_external}
                onCheckedChange={checked => setForm(p => ({ ...p, url_force_external: checked }))}
                title="Ouvrir en lien externe"
                className="shrink-0"
              />
              <Input
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="flex-1 min-w-0"
              />
              {form.url && (
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 px-2" onClick={() => setForm(p => ({ ...p, url: "" }))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Select value={form.url_cta || "__none__"} onValueChange={v => setForm(p => ({ ...p, url_cta: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="w-64 shrink-0">
                  <SelectValue placeholder="🎯 CTA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {[
                    "Acheter en ligne", "Achetez", "Boissons", "Carte des soins", "Carte des vins",
                    "Cocktails", "Consulter notre offre", "Contactez-moi", "Contactez nous",
                    "Day Pass", "Forfaits", "Hammam", "Hotel", "La carte", "Les boissons",
                    "Menu", "Nos services", "Notre offre", "Plus d'informations",
                    "Réserver en ligne", "Réservez", "Restaurant", "Riad", "Site web", "Spa",
                  ].map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.url_force_external && <span className="text-xs text-orange-600">⚡ Lien externe activé</span>}
          </div>

          <div>
            <Label>Description</Label>
            <RichTextEditor
              content={form.description}
              onChange={html => setForm(p => ({ ...p, description: html }))}
              maxHeight="600px"
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Images ({form.images.length}/10)</Label>
            <ImageUploader
              images={form.images}
              onChange={images => setForm(p => ({ ...p, images }))}
              maxImages={10}
            />
          </div>

          <div>
            <Label className="text-base font-semibold">Vidéos ({form.videos.length}/10)</Label>
            <VideosDndList form={form} setForm={setForm} toast={toast} />
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
              <TableHead>Type</TableHead>
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
                <TableCell className="text-sm text-muted-foreground">{ev.type || "—"}</TableCell>
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
