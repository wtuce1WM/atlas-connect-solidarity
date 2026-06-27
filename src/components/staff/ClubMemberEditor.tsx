import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Plane, Bookmark, MessageSquare, BarChart3 } from "lucide-react";

interface Props {
  memberId: string | null;
  open: boolean;
  onClose: () => void;
}

const FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "first_name", label: "Prénom" },
  { key: "last_name", label: "Nom" },
  { key: "nickname", label: "Pseudonyme" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Téléphone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays" },
  { key: "avatar_url", label: "Avatar URL" },
  { key: "website", label: "Site web" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "Twitter / X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "pinterest", label: "Pinterest" },
  { key: "spotify", label: "Spotify" },
  { key: "soundcloud", label: "SoundCloud" },
];

const ClubMemberEditor = ({ memberId, open, onClose }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    if (!open || !memberId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("staff_get_member_details" as any, { p_member_id: memberId });
      if (error) {
        toast({ variant: "destructive", title: "Erreur", description: error.message });
      } else {
        setDetails(data);
        const m = (data as any)?.member || {};
        const f: Record<string, string> = {};
        FIELDS.forEach(({ key }) => (f[key] = m[key] ?? ""));
        setForm(f);
        setDescription(m.description ?? "");
      }
      setLoading(false);
    };
    load();
  }, [open, memberId, toast]);

  const handleSave = async () => {
    if (!memberId) return;
    setSaving(true);
    const payload: Record<string, string | null> = { description };
    FIELDS.forEach(({ key }) => {
      payload[key] = form[key] === "" ? null : form[key];
    });
    const { error } = await supabase.rpc("staff_update_club_member" as any, {
      p_member_id: memberId,
      p_payload: payload,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    } else {
      toast({ title: "Enregistré", description: "Fiche membre mise à jour." });
      onClose();
    }
  };

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const stats = details?.stats || {};
  const trips = details?.trips || [];
  const bookmarks = details?.bookmarks || [];
  const chats = details?.ai_chats || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fiche membre — {form.nickname || "…"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="account">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="account" className="gap-1"><User className="h-4 w-4" />Compte</TabsTrigger>
              <TabsTrigger value="stats" className="gap-1"><BarChart3 className="h-4 w-4" />Activité</TabsTrigger>
              <TabsTrigger value="trips" className="gap-1"><Plane className="h-4 w-4" />Voyages</TabsTrigger>
              <TabsTrigger value="bookmarks" className="gap-1"><Bookmark className="h-4 w-4" />Adresses</TabsTrigger>
              <TabsTrigger value="chats" className="gap-1"><MessageSquare className="h-4 w-4" />Chats IA</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FIELDS.map(({ key, label, type }) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={key} className="text-xs">{label}</Label>
                    <Input
                      id={key}
                      type={type || "text"}
                      value={form[key] || ""}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Voyages", value: stats.total_trips },
                  { label: "Adresses sauvegardées", value: stats.total_bookmarks },
                  { label: "Conversations IA", value: stats.total_chats },
                  { label: "Messages IA", value: stats.total_messages },
                  { label: "Chats bookmarkés", value: stats.bookmarked_chats },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-gold">{s.value ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Les tokens IA sont facturés au niveau du workspace (AI Gateway).
                Cette vue affiche l'activité IA propre au membre comme proxy individuel.
              </p>
            </TabsContent>

            <TabsContent value="trips" className="mt-4 space-y-2">
              {trips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun voyage.</p>
              ) : (
                trips.map((t: any) => (
                  <div key={t.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{t.title}</div>
                      <span className="text-xs text-muted-foreground">{t.business_count} adresse(s)</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fmt(t.arrival_date)} → {fmt(t.departure_date)}
                    </div>
                    {t.description && <div className="text-sm mt-1">{t.description}</div>}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-4 space-y-1">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune adresse sauvegardée.</p>
              ) : (
                bookmarks.map((b: any) => (
                  <a
                    key={b.id}
                    href={b.slug ? `/b/${b.slug}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-muted/50 text-sm"
                  >
                    <div>
                      <div className="font-medium">{b.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{b.city || ""}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(b.created_at)}</span>
                  </a>
                ))
              )}
            </TabsContent>

            <TabsContent value="chats" className="mt-4 space-y-1">
              {chats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune conversation bookmarkée.</p>
              ) : (
                chats.map((c: any) => (
                  <div key={c.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{c.title}</div>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted">{c.kind}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.message_count} message(s) · {c.city || "—"} · maj {fmt(c.updated_at)}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer le compte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClubMemberEditor;
