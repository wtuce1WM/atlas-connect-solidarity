import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Save, Plus, ImageIcon, Film, X, Copy, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { SHOWCASE_TEMPLATES, resolveShowcaseTemplate } from "@/components/showcase/templates";
import { resolveShowcaseGroupLayout } from "@/components/showcase/groupLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type Row = {
  id: string;
  business_id: string;
  enabled: boolean;
  template: string | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  hero_image_url: string | null;
  hero_landscape_video_id: string | null;
  hero_portrait_video_id: string | null;
  hero_sound?: boolean;
  story_fr: string | null;
  story_en: string | null;
  cta_config: Record<string, string> | null;
  show_kp1: boolean;
  show_kp2: boolean;
  business: { name: string; slug: string; logo_url: string | null; images: string[] | null; kp_regroupement: string | null; kp_regroupement_2: string | null } | null;
};

const CTA_FIELDS: Array<[string, string]> = [
  ["assistant_name", "Nom de l'assistant IA (ex. Zitoun IA)"],
  ["primary_label", "Libellé bouton principal"],
  ["reserve_url", "URL de réservation"],
  ["whatsapp", "WhatsApp"],
  ["phone", "Téléphone"],
  ["email", "Email"],
];

const MediaField = ({ label, hint, kind, value, onPick, onClear }: { label: string; hint: string; kind: "image" | "video"; value: string | null; onPick: () => void; onClear: () => void }) => (
  <div>
    <Label>{label}</Label>
    <div className="mt-1 flex items-center gap-3">
      <button type="button" onClick={onPick} className="h-20 w-32 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center hover:border-primary">
        {value ? (value ? <img src={value} alt="" className="h-full w-full object-cover" /> : null) : kind === "image" ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <Film className="h-5 w-5 text-muted-foreground" />}
      </button>
      <div className="space-y-1">
        <Button type="button" size="sm" variant="secondary" onClick={onPick}>{value !== null ? "Changer" : "Choisir"}</Button>
        {value !== null && <Button type="button" size="sm" variant="ghost" onClick={onClear}><X className="h-3.5 w-3.5 mr-1" />Retirer</Button>}
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  </div>
);

const ShowcaseCard = ({ initial }: { initial: Row }) => {
  const [r, setR] = useState<Row>(initial);
  const [saving, setSaving] = useState(false);
  const slug = r.business?.slug || "";
  const set = (k: keyof Row, v: any) => setR((p) => ({ ...p, [k]: v }));
  const [picker, setPicker] = useState<null | "hero" | "landscape" | "portrait">(null);
  const [videos, setVideos] = useState<Array<{ id: string; thumb: string | null; title: string | null; source: string }> | null>(null);
  useEffect(() => {
    (async () => {
      const [yt, docs] = await Promise.all([
        (supabase as any).from("business_youtube_videos").select("id,title,thumbnail,custom_thumbnail_url").eq("business_id", r.business_id).order("sort_order"),
        (supabase as any).from("business_documents").select("id,name,thumbnail_url").eq("business_id", r.business_id).eq("type", "video"),
      ]);
      setVideos([
        ...((docs.data || []) as any[]).map((d) => ({ id: d.id, thumb: d.thumbnail_url, title: d.name, source: "Vidéo importée" })),
        ...((yt.data || []) as any[]).map((v) => ({ id: v.id, thumb: v.custom_thumbnail_url || v.thumbnail, title: v.title, source: "YouTube" })),
      ]);
    })();
  }, [r.business_id]);
  const videoThumbs = Object.fromEntries((videos || []).map((v) => [v.id, v.thumb || ""]));
  const setCta = (k: string, v: string) => setR((p) => ({ ...p, cta_config: { ...(p.cta_config || {}), [k]: v } }));

  const save = async () => {
    setSaving(true);
    const cta = Object.fromEntries(Object.entries(r.cta_config || {}).filter(([, v]) => v));
    const [a, b] = await Promise.all([
      supabase.from("business_showcase_site").update({
        enabled: r.enabled,
        template: r.template || "premium",
        tagline_fr: r.tagline_fr || null,
        tagline_en: r.tagline_en || null,
        hero_image_url: r.hero_image_url || null,
        hero_landscape_video_id: r.hero_landscape_video_id || null,
        hero_portrait_video_id: r.hero_portrait_video_id || null,
        hero_sound: !!r.hero_sound,
        story_fr: r.story_fr || null,
        story_en: r.story_en || null,
        cta_config: cta,
        show_kp1: r.show_kp1,
        show_kp2: r.show_kp2,
      } as any).eq("id", r.id),
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

      <details className="group">
        <summary className="cursor-pointer select-none text-sm font-semibold text-muted-foreground">Détail du modèle ({SHOWCASE_TEMPLATES.find((t) => t.id === resolveShowcaseTemplate(r.template))?.label})</summary>
        <div className="space-y-4 pt-4">
      <div>
        <Label>Modèle</Label>
        <div className="grid sm:grid-cols-3 gap-3 mt-2">
          {SHOWCASE_TEMPLATES.map((t) => {
            const active = resolveShowcaseTemplate(r.template) === t.id;
            return (
              <div key={t.id} className={`rounded-lg border p-3 ${active ? "border-primary ring-1 ring-primary" : ""}`}>
                <button type="button" onClick={() => set("template", t.id)} className="text-left w-full">
                  <div className="font-semibold text-sm">{t.label}{active && " ✓"}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
                <a href={`/site/${slug}?template=${t.id}`} target="_blank" rel="noreferrer" className="text-xs underline inline-flex items-center gap-1 mt-2">Prévisualiser <ExternalLink className="h-3 w-3" /></a>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><Label>Accroche FR</Label><Input value={r.tagline_fr || ""} onChange={(e) => set("tagline_fr", e.target.value)} /></div>
        <div><Label>Accroche EN</Label><Input value={r.tagline_en || ""} onChange={(e) => set("tagline_en", e.target.value)} /></div>
        <MediaField label="Image hero" hint="Image fixe du haut de page." kind="image" value={r.hero_image_url} onPick={() => setPicker("hero")} onClear={() => set("hero_image_url", null)} />
        <MediaField label="Vidéo / image paysage (écrans larges)" hint="Vidéo du business ; sa miniature sert d'image." kind="video" value={r.hero_landscape_video_id ? (videoThumbs[r.hero_landscape_video_id] ?? "") : null} onPick={() => setPicker("landscape")} onClear={() => set("hero_landscape_video_id", null)} />
        <MediaField label="Vidéo / image portrait (mobile)" hint="Vidéo du business ; sa miniature sert d'image." kind="video" value={r.hero_portrait_video_id ? (videoThumbs[r.hero_portrait_video_id] ?? "") : null} onPick={() => setPicker("portrait")} onClear={() => set("hero_portrait_video_id", null)} />
        {resolveShowcaseTemplate(r.template) === "hero_video" ? (
          <label className="flex items-center justify-between gap-3 rounded-md border p-3">
            <span><span className="block text-sm font-medium">Son de la vidéo du haut de page</span><span className="block text-xs text-muted-foreground">Le navigateur peut démarrer sans son : un bouton permet alors au visiteur d'activer le son.</span></span>
            <Switch checked={!!r.hero_sound} onCheckedChange={(v) => set("hero_sound", v)} />
          </label>
        ) : <div />}
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Groupes affichés sur la vitrine</Label>
          <Select value={resolveShowcaseGroupLayout(r.cta_config?.groups_layout)} onValueChange={(value) => setCta("groups_layout", value)}>
            <SelectTrigger className="w-52 normal-case tracking-normal" aria-label="Affichage des groupes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carousel">carousel</SelectItem>
              <SelectItem value="stacking_cards">stacking cards</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!r.business?.kp_regroupement && !r.business?.kp_regroupement_2 && <p className="text-xs text-muted-foreground">Aucun Groupe KP1/KP2 pour cet établissement.</p>}
        {r.business?.kp_regroupement && (
          <div className="flex items-center gap-2"><Switch checked={r.show_kp1} onCheckedChange={(v) => set("show_kp1", v)} /><span className="text-sm">Groupe KP1 : <b>{r.business.kp_regroupement}</b> — {r.show_kp1 ? "Oui" : "Non"}</span><select className="ml-auto h-8 rounded-md border bg-background px-2 text-sm" value={r.cta_config?.kp1_display || "pages"} onChange={(e) => setCta("kp1_display", e.target.value)}><option value="pages">1 page par business</option><option value="map">Map</option></select></div>
        )}
        {r.business?.kp_regroupement_2 && (
          <div className="flex items-center gap-2"><Switch checked={r.show_kp2} onCheckedChange={(v) => set("show_kp2", v)} /><span className="text-sm">Groupe KP2 : <b>{r.business.kp_regroupement_2}</b> — {r.show_kp2 ? "Oui" : "Non"}</span><select className="ml-auto h-8 rounded-md border bg-background px-2 text-sm" value={r.cta_config?.kp2_display || "pages"} onChange={(e) => setCta("kp2_display", e.target.value)}><option value="pages">1 page par business</option><option value="map">Map</option></select></div>
        )}
      </div>
      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{picker === "hero" ? "Choisir l'image hero" : picker === "landscape" ? "Choisir la vidéo paysage" : "Choisir la vidéo portrait"}</DialogTitle></DialogHeader>
          {picker === "hero" ? (
            (r.business?.images || []).length === 0 ? <p className="text-sm text-muted-foreground">Aucune image pour cet établissement.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(r.business?.images || []).filter(Boolean).map((url) => (
                  <button key={url} type="button" onClick={() => { set("hero_image_url", url); setPicker(null); }} className={`aspect-[4/3] overflow-hidden rounded-md border-2 ${r.hero_image_url === url ? "border-primary" : "border-transparent hover:border-primary/40"}`}>
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )
          ) : videos === null ? <p className="text-sm">Chargement…</p> : videos.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vidéo pour cet établissement.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {videos.map((v) => {
                const cur = picker === "landscape" ? r.hero_landscape_video_id : r.hero_portrait_video_id;
                return (
                  <button key={v.id} type="button" onClick={() => { set(picker === "landscape" ? "hero_landscape_video_id" : "hero_portrait_video_id", v.id); setPicker(null); }} className={`text-left rounded-md border-2 overflow-hidden ${cur === v.id ? "border-primary" : "border-transparent hover:border-primary/40"}`}>
                    <div className="aspect-video bg-muted">{v.thumb ? <img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center"><Film className="h-6 w-6 text-muted-foreground" /></div>}</div>
                    <div className="p-1.5 text-xs"><span className="font-semibold">{v.source}</span> · <span className="line-clamp-1">{v.title || "Sans titre"}</span></div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        </div>
      </details>
    </div>
  );
};

const StaffShowcase = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [reload, setReload] = useState(0);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Array<{ id: string; name: string; city: string | null }>>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("businesses").select("id,name,city").ilike("name", `%${q.trim()}%`).limit(10);
      setFound((data as any) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const addBusiness = async (id: string) => {
    if (rows?.some((r) => r.business_id === id)) { toast.info("Déjà dans la liste"); return; }
    const { error } = await supabase.from("business_showcase_site").insert({ business_id: id, enabled: false } as any);
    if (error) toast.error(error.message);
    else { toast.success("Établissement ajouté (désactivé)"); setQ(""); setReload((n) => n + 1); }
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/staff/login"); return; }
      const { data, error } = await supabase
        .from("business_showcase_site")
        .select("id,business_id,enabled,template,tagline_fr,tagline_en,hero_image_url,hero_landscape_video_id,hero_portrait_video_id,hero_sound,story_fr,story_en,cta_config,show_kp1,show_kp2,business:businesses(name,slug,logo_url,images,kp_regroupement,kp_regroupement_2)")
        .order("created_at");
      if (error) toast.error(error.message);
      setRows((data as any) || []);
    })();
  }, [navigate, reload]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/staff/backoffice")}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
          <h1 className="text-2xl font-bold">Sites vitrines & PWAs</h1>
        </div>
        <div className="border rounded-xl p-4 bg-card space-y-2">
          <Label className="flex items-center gap-1"><Plus className="h-4 w-4" />Ajouter un établissement</Label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un établissement par nom…" />
          {found.length > 0 && (
            <div className="border rounded-md divide-y">
              {found.map((b) => (
                <button key={b.id} type="button" onClick={() => addBusiness(b.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                  {b.name}{b.city ? <span className="text-muted-foreground"> · {b.city}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        {!rows ? <p>Chargement…</p> : rows.map((r) => <ShowcaseCard key={r.id} initial={r} />)}
        {rows && rows.length > 0 && (() => {
          const list = rows.map((r) => {
            const slug = r.business?.slug || "";
            return { name: r.business?.name || "", enabled: r.enabled, template: SHOWCASE_TEMPLATES.find((t) => t.id === resolveShowcaseTemplate(r.template))?.label || "", site: `https://oneworldmorocco.com/site/${slug}` };
          });
          const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copié"));
          const tsv = ["Établissement\tStatut\tModèle\tSite vitrine", ...list.map((l) => [l.name, l.enabled ? "Activé" : "Désactivé", l.template, l.site].join("\t"))].join("\n");
          return (
            <div className="border rounded-xl p-5 bg-card space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-lg font-bold">Récapitulatif</h2>
                <Button size="sm" variant="outline" onClick={() => copy(tsv)}><Copy className="h-4 w-4 mr-2" />Copier le tableau</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2 pr-3">Établissement</th><th className="py-2 pr-3">Statut</th><th className="py-2 pr-3">Modèle</th><th className="py-2 pr-3">Site vitrine</th><th className="py-2">Installer l'app</th></tr></thead>
                  <tbody>
                    {list.map((l) => (
                      <tr key={l.site} className="border-b align-top">
                        <td className="py-2 pr-3 font-medium">{l.name}</td>
                        <td className="py-2 pr-3">{l.enabled ? "Activé" : "Désactivé"}</td>
                        <td className="py-2 pr-3">{l.template}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1">
                            <a href={l.site} target="_blank" rel="noreferrer" className="underline break-all">{l.site.replace(/^https:\/\//, "")}</a>
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Copier" onClick={() => copy(l.site)}><Copy className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                        <td className="py-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline"><HelpCircle className="h-4 w-4 mr-1" />Installer l'app</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm space-y-1">
                              <p className="font-medium">Installer l'app sur iPhone</p>
                              <p>1. Ouvrez le lien du site dans Safari sur l'iPhone.</p>
                              <p>2. Touchez le bouton Partager en bas de l'écran.</p>
                              <p>3. Choisissez « Sur l'écran d'accueil ».</p>
                              <p className="text-muted-foreground">L'icône du business apparaît alors sur l'écran d'accueil, et l'app s'ouvre en plein écran. Sur Android, Chrome propose l'installation directement depuis le menu du navigateur.</p>
                            </PopoverContent>
                          </Popover>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default StaffShowcase;
