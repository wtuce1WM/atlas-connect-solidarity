import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Pencil, Trash2, MapPin, Calendar, Clock, X, Search } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Business { id: string; name: string; city: string | null; }
interface TripBusiness { business_id: string; business: Business | null; }
interface Trip {
  id: string;
  title: string;
  description: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  club_trip_businesses: TripBusiness[];
}

const TITLE_MAX = 50;
const DESC_MAX = 150;

const emptyForm = {
  title: "",
  description: "",
  arrival_date: "",
  departure_date: "",
  arrival_time: "",
  departure_time: "",
  businesses: [] as Business[],
};

const ClubTrips = ({ userId }: { userId: string }) => {
  const { language } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const t = (fr: string, en: string, ar: string) => language === "en" ? en : language === "ar" ? ar : fr;

  const loadTrips = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("club_trips")
      .select("id, title, description, arrival_date, departure_date, arrival_time, departure_time, club_trip_businesses(business_id, business:businesses(id, name, city))")
      .eq("user_id", userId)
      .order("arrival_date", { ascending: true, nullsFirst: false });
    if (!error) setTrips((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { loadTrips(); /* eslint-disable-next-line */ }, [userId]);

  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) { setSearchResults([]); return; }
    const ctrl = new AbortController();
    const tm = setTimeout(async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, city")
        .ilike("name", `%${search.trim()}%`)
        .eq("is_active", true)
        .limit(8);
      if (!ctrl.signal.aborted) setSearchResults((data || []) as Business[]);
    }, 250);
    return () => { ctrl.abort(); clearTimeout(tm); };
  }, [search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSearch("");
    setDialogOpen(true);
  };

  const openEdit = (trip: Trip) => {
    setEditingId(trip.id);
    setForm({
      title: trip.title || "",
      description: trip.description || "",
      arrival_date: trip.arrival_date || "",
      departure_date: trip.departure_date || "",
      arrival_time: trip.arrival_time ? trip.arrival_time.slice(0, 5) : "",
      departure_time: trip.departure_time ? trip.departure_time.slice(0, 5) : "",
      businesses: (trip.club_trip_businesses || []).map(tb => tb.business).filter(Boolean) as Business[],
    });
    setSearch("");
    setDialogOpen(true);
  };

  const addBusiness = (b: Business) => {
    if (form.businesses.some(x => x.id === b.id)) return;
    setForm(f => ({ ...f, businesses: [...f.businesses, b] }));
    setSearch("");
    setSearchResults([]);
  };

  const removeBusiness = (id: string) => {
    setForm(f => ({ ...f, businesses: f.businesses.filter(b => b.id !== id) }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: t("Titre requis", "Title required", "العنوان مطلوب"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      title: form.title.trim().slice(0, TITLE_MAX),
      description: form.description.trim().slice(0, DESC_MAX) || null,
      arrival_date: form.arrival_date || null,
      departure_date: form.departure_date || null,
      arrival_time: form.arrival_time || null,
      departure_time: form.departure_time || null,
    };
    let tripId = editingId;
    if (editingId) {
      const { error } = await supabase.from("club_trips").update(payload).eq("id", editingId);
      if (error) { toast({ title: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("club_trips").insert(payload).select("id").single();
      if (error) { toast({ title: error.message, variant: "destructive" }); setSaving(false); return; }
      tripId = data.id;
    }
    // Replace business links
    if (tripId) {
      await supabase.from("club_trip_businesses").delete().eq("trip_id", tripId);
      if (form.businesses.length > 0) {
        const rows = form.businesses.map((b, i) => ({ trip_id: tripId!, business_id: b.id, sort_order: i }));
        await supabase.from("club_trip_businesses").insert(rows);
      }
    }
    toast({ title: t("Voyage enregistré", "Trip saved", "تم الحفظ") });
    setDialogOpen(false);
    setSaving(false);
    loadTrips();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("club_trips").delete().eq("id", deleteId);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: t("Voyage supprimé", "Trip deleted", "تم الحذف") });
    setDeleteId(null);
    loadTrips();
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString(language === "en" ? "en-GB" : language === "ar" ? "ar-MA" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtTime = (t: string | null) => t ? t.slice(0, 5) : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {t("Mes voyages", "My trips", "رحلاتي")}
        </h2>
        <Button onClick={openCreate} className="bg-[#C04F17] hover:bg-[#a3431a] text-white">
          <Plus className="w-4 h-4 mr-1" />
          {t("Nouveau voyage", "New trip", "رحلة جديدة")}
        </Button>
      </div>

      {loading ? (
        <div className="text-white/70 text-sm">{t("Chargement…", "Loading…", "جار التحميل…")}</div>
      ) : trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/30 bg-white/10 p-10 text-center text-sm text-white/90">
          {t("Aucun voyage. Créez votre premier voyage !", "No trip yet. Create your first one!", "لا توجد رحلات بعد.")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {trips.map(trip => (
            <div key={trip.id} className="rounded-xl bg-[#BED1FF] p-4 text-[#0a1d4a] shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base leading-tight">{trip.title}</h3>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(trip)} className="p-1.5 rounded hover:bg-white/40" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(trip.id)} className="p-1.5 rounded hover:bg-white/40 text-red-700" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {trip.description && <p className="text-sm mt-1 opacity-90">{trip.description}</p>}
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{fmtDate(trip.arrival_date)} → {fmtDate(trip.departure_date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{fmtTime(trip.arrival_time)} → {fmtTime(trip.departure_time)}</span>
                </div>
              </div>
              {trip.club_trip_businesses?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {trip.club_trip_businesses.map(tb => tb.business && (
                    <span key={tb.business_id} className="inline-flex items-center gap-1 text-xs bg-white/70 rounded-full px-2 py-0.5">
                      <MapPin className="w-3 h-3" />
                      {tb.business.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t("Modifier le voyage", "Edit trip", "تعديل") : t("Nouveau voyage", "New trip", "رحلة جديدة")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("Titre", "Title", "العنوان")} <span className="text-xs text-muted-foreground">({form.title.length}/{TITLE_MAX})</span></Label>
              <Input value={form.title} maxLength={TITLE_MAX} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>{t("Description", "Description", "الوصف")} <span className="text-xs text-muted-foreground">({form.description.length}/{DESC_MAX})</span></Label>
              <Textarea value={form.description} maxLength={DESC_MAX} rows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("Date d'arrivée", "Arrival date", "تاريخ الوصول")}</Label>
                <Input type="date" value={form.arrival_date} onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))} />
              </div>
              <div>
                <Label>{t("Date de départ", "Departure date", "تاريخ المغادرة")}</Label>
                <Input type="date" value={form.departure_date} onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} />
              </div>
              <div>
                <Label>{t("Heure d'arrivée", "Arrival time", "وقت الوصول")}</Label>
                <Input type="time" value={form.arrival_time} onChange={e => setForm(f => ({ ...f, arrival_time: e.target.value }))} />
              </div>
              <div>
                <Label>{t("Heure de départ", "Departure time", "وقت المغادرة")}</Label>
                <Input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("Établissements liés", "Linked businesses", "المنشآت")}</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder={t("Rechercher un établissement…", "Search a business…", "ابحث…")}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => addBusiness(b)}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                      >
                        <span>{b.name}</span>
                        {b.city && <span className="text-xs text-muted-foreground">{b.city}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.businesses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.businesses.map(b => (
                    <span key={b.id} className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full pl-2 pr-1 py-1">
                      {b.name}
                      <button type="button" onClick={() => removeBusiness(b.id)} className="hover:bg-background/60 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("Annuler", "Cancel", "إلغاء")}</Button>
            <Button onClick={save} disabled={saving} className="bg-[#194CFF] hover:bg-[#1340d6] text-white">
              {saving ? t("Enregistrement…", "Saving…", "حفظ…") : t("Enregistrer", "Save", "حفظ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Supprimer ce voyage ?", "Delete this trip?", "حذف؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Cette action est irréversible.", "This action cannot be undone.", "")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Annuler", "Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("Supprimer", "Delete", "حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClubTrips;
