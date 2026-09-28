import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Save } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type Row = {
  id: string;
  business_id: string;
  enabled: boolean;
  tagline_fr: string | null;
  tagline_en: string | null;
  hero_image_url: string | null;
  hero_landscape_video_id: string | null;
  hero_portrait_video_id: string | null;
  story_fr: string | null;
  story_en: string | null;
  cta_config: Record<string, string> | null;
  business: { name: string; slug: string; logo_url: string | null } | null;
};

const CTA_FIELDS: Array<[string, string]> = [
  ["primary_label", "Libellé bouton principal"],
  ["reserve_url", "URL de réservation"],
  ["whatsapp", "WhatsApp"],
  ["phone", "Téléphone"],
  ["email", "Email"],
];

const ShowcaseCard = ({ initial }: { initial: Row }) => {
  const [r, setR] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);
  const slug = r.business?.slug || "";
  const set = (k: keyof Row, v: any) => setR((p) => ({ ...p, [k]: v }));
  const setCta = (k: string, v: string) => setR((p) => ({ ...p, cta_config: { ...(p.cta_config || {}), [k]: v } }));

  const save = async () => {
    setSaving(true);
    const cta = Object.fromEntries(Object.entries(r.cta_config || {}).filter(([, v]) => v));
    const [a, b] = await Promise.all([
      supabase.from("business_showcase_site").update({
        enabled: r.enabled,
        tagline_fr: r.tagline_fr || null,
        tagline_en: r.tagline_en || null,
        hero_image_url: r.hero_image_url || null,
        hero_landscape_video_id: r.hero_landscape_video_id || null,
        hero_portrait_video_id: r.hero_portrait_video_id || null,
        story_fr: r.story_fr || null,
        story_en: r.story_en || null,
        cta_config: cta,
      }).eq("id", r.id),
      supabase.from("businesses").update({ logo_url: r.business?.logo_url || null }).eq("id", r.business_id),
    ]);
    setSaving(false);
    if (a.error || b.error) toast.error((a.error || b.error)!.message);
    else toast.success("Enregistré");
  };

  return (
    <div className="border rounded-xl p-5 space-y-4 bg-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {r.business?.logo_url && <img src={r.business.logo_url} alt="" className="h-10 w-10 rounded object-cover" />}
          <h2 className="text-lg font-bold">{r.business?.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={r.enabled} onCheckedChange={(v) => set("enabled", v)} />
            <span className="text-sm">{r.enabled ? "Activé" : "Désactivé"}</span>
          </div>
          <a href={`/site/${slug}`} target="_blank" rel="noreferrer" className="text-sm underline inline-flex items-center gap-1">Site <ExternalLink className="h-3 w-3" /></a>
          <a href={`${SUPABASE_URL}/functions/v1/pwa-manifest?slug=${slug}`} target="_blank" rel="noreferrer" className="text-sm underline inline-flex items-center gap-1">Manifeste PWA <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><Label>Accroche FR</Label><Input value={r.tagline_fr || ""} onChange={(e) => set("tagline_fr", e.target.value)} /></div>
        <div><Label>Accroche EN</Label><Input value={r.tagline_en || ""} onChange={(e) => set("tagline_en", e.target.value)} /></div>
        <div><Label>Image hero (URL)</Label><Input value={r.hero_image_url || ""} onChange={(e) => set("hero_image_url", e.target.value)} /></div>
        <div>
          <Label>Image landscape (ID vidéo)</Label>
          <Input value={r.hero_landscape_video_id || ""} onChange={(e) => set("hero_landscape_video_id", e.target.value)} placeholder="ex. dQw4w9WgXcQ" />
          <p className="text-xs text-muted-foreground mt-1">ID YouTube — la miniature de la vidéo est utilisée (format paysage).</p>
        </div>
        <div>
          <Label>Image portrait (ID vidéo)</Label>
          <Input value={r.hero_portrait_video_id || ""} onChange={(e) => set("hero_portrait_video_id", e.target.value)} placeholder="ex. dQw4w9WgXcQ" />
          <p className="text-xs text-muted-foreground mt-1">ID YouTube — la miniature de la vidéo est utilisée (format portrait / mobile).</p>
        </div>
        <div><Label>Histoire FR</Label><Textarea rows={4} value={r.story_fr || ""} onChange={(e) => set("story_fr", e.target.value)} /></div>
        <div><Label>Histoire EN</Label><Textarea rows={4} value={r.story_en || ""} onChange={(e) => set("story_en", e.target.value)} /></div>
        {CTA_FIELDS.map(([k, l]) => (
          <div key={k}><Label>{l}</Label><Input value={r.cta_config?.[k] || ""} onChange={(e) => setCta(k, e.target.value)} /></div>
        ))}
        <div>
          <Label>Logo / icône PWA (URL)</Label>
          <Input value={r.business?.logo_url || ""} onChange={(e) => setR((p) => ({ ...p, business: { ...p.business!, logo_url: e.target.value } }))} />
          <p className="text-xs text-muted-foreground mt-1">Icône de l'app installée (sinon image hero, puis image 1).</p>
        </div>
      </div>
      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement…" : "Enregistrer"}</Button>
    </div>
  );
};

const StaffShowcase = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data, error } = await supabase
        .from("business_showcase_site")
        .select("id,business_id,enabled,tagline_fr,tagline_en,hero_image_url,hero_landscape_video_id,hero_portrait_video_id,story_fr,story_en,cta_config,business:businesses(name,slug,logo_url)")
        .order("created_at");
      if (error) toast.error(error.message);
      setRows((data as any) || []);
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/staff/backoffice")}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
          <h1 className="text-2xl font-bold">Sites vitrines & PWAs</h1>
        </div>
        {!rows ? <p>Chargement…</p> : rows.map((r) => <ShowcaseCard key={r.id} initial={r} />)}
      </div>
    </div>
  );
};

export default StaffShowcase;
