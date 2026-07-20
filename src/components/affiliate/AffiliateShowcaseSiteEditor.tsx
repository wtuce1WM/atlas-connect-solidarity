import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ExternalLink, Save, Globe, Plus, Trash2 } from "lucide-react";
import RichTextEditor from "@/components/staff/RichTextEditor";
import ShowcaseSiteStats from "./ShowcaseSiteStats";

interface Props {
  businessId: string;
  businessSlug: string | null;
}

interface Testimonial {
  author: string;
  quote: string;
  location?: string;
}

interface CtaConfig {
  whatsapp?: string;
  phone?: string;
  email?: string;
  reserve_url?: string;
  primary_label?: string;
}

const AffiliateShowcaseSiteEditor = ({ businessId, businessSlug }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [taglineFr, setTaglineFr] = useState("");
  const [taglineEn, setTaglineEn] = useState("");
  const [taglineAr, setTaglineAr] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroVideoUrl, setHeroVideoUrl] = useState("");
  const [storyFr, setStoryFr] = useState("");
  const [storyEn, setStoryEn] = useState("");
  const [storyAr, setStoryAr] = useState("");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [cta, setCta] = useState<CtaConfig>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("business_showcase_site")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();
      if (data) {
        setRecordId(data.id);
        setEnabled(!!data.enabled);
        setCanonicalUrl(data.canonical_url || "");
        setCustomDomain(data.custom_domain || "");
        setTaglineFr(data.tagline_fr || "");
        setTaglineEn(data.tagline_en || "");
        setTaglineAr(data.tagline_ar || "");
        setHeroImageUrl(data.hero_image_url || "");
        setHeroVideoUrl(data.hero_video_url || "");
        setStoryFr(data.story_fr || "");
        setStoryEn(data.story_en || "");
        setStoryAr(data.story_ar || "");
        setTestimonials(Array.isArray(data.testimonials) ? data.testimonials : []);
        setCta(data.cta_config || {});
      }
      setLoading(false);
    };
    load();
  }, [businessId]);

  const save = useCallback(async () => {
    setSaving(true);
    const payload = {
      business_id: businessId,
      enabled,
      canonical_url: canonicalUrl.trim() || null,
      custom_domain: customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null,
      tagline_fr: taglineFr.trim() || null,
      tagline_en: taglineEn.trim() || null,
      tagline_ar: taglineAr.trim() || null,
      hero_image_url: heroImageUrl.trim() || null,
      hero_video_url: heroVideoUrl.trim() || null,
      story_fr: storyFr || null,
      story_en: storyEn || null,
      story_ar: storyAr || null,
      testimonials,
      cta_config: cta,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (recordId) {
      ({ error } = await (supabase as any).from("business_showcase_site").update(payload).eq("id", recordId));
    } else {
      const { data, error: e } = await (supabase as any).from("business_showcase_site").insert(payload).select("id").single();
      error = e;
      if (data) setRecordId(data.id);
    }
    setSaving(false);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Site vitrine enregistré" });
  }, [businessId, recordId, enabled, canonicalUrl, customDomain, taglineFr, taglineEn, taglineAr, heroImageUrl, heroVideoUrl, storyFr, storyEn, storyAr, testimonials, cta, toast]);

  const publicUrl = businessSlug ? `https://oneworldmorocco.com/site/${businessSlug}` : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Mini-dashboard stats */}
      <ShowcaseSiteStats businessId={businessId} />

      {/* Header */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Site vitrine 1WM</h3>
              <p className="text-xs text-white/60">Une page web signée 1WM pour remplacer votre site — sans duplicate content grâce au canonical vers votre domaine.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Activer le site vitrine</span>
          </label>
        </div>
        {publicUrl && enabled && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> {publicUrl}
          </a>
        )}
      </div>

      {/* SEO / Domain */}
      <div className="space-y-3">
        <h4 className="font-semibold">SEO & Domaine</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-white/80">URL canonique (votre site officiel)</Label>
            <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://www.votresite.com/" className="bg-white/10 border-white/20 text-white" />
            <p className="text-xs text-white/50 mt-1">Google attribue le SEO à cette URL — évite le duplicate content.</p>
          </div>
          <div>
            <Label className="text-white/80">Domaine personnalisé (optionnel)</Label>
            <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="www.votresite.com" className="bg-white/10 border-white/20 text-white" />
            <p className="text-xs text-white/50 mt-1">Pour servir cette page sous votre domaine (setup DNS à venir).</p>
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div className="space-y-3">
        <h4 className="font-semibold">Accroche (max 120 caractères)</h4>
        <div className="grid gap-3">
          <div>
            <Label className="text-white/80">FR</Label>
            <Input maxLength={120} value={taglineFr} onChange={(e) => setTaglineFr(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">EN</Label>
            <Input maxLength={120} value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">AR</Label>
            <Input maxLength={120} value={taglineAr} onChange={(e) => setTaglineAr(e.target.value)} dir="rtl" className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <h4 className="font-semibold">Média Hero</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-white/80">Image hero (URL)</Label>
            <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://…" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">Vidéo hero (URL YouTube/MP4)</Label>
            <Input value={heroVideoUrl} onChange={(e) => setHeroVideoUrl(e.target.value)} placeholder="https://…" className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>
      </div>

      {/* Story */}
      <div className="space-y-3">
        <h4 className="font-semibold">Récit long (voix éditoriale — différent de la fiche annuaire)</h4>
        <div className="space-y-3">
          <div>
            <Label className="text-white/80">FR</Label>
            <RichTextEditor content={storyFr} onChange={setStoryFr} placeholder="Racontez votre histoire…" maxHeight="300px" />
          </div>
          <div>
            <Label className="text-white/80">EN</Label>
            <RichTextEditor content={storyEn} onChange={setStoryEn} placeholder="Tell your story…" maxHeight="300px" />
          </div>
          <div>
            <Label className="text-white/80">AR</Label>
            <RichTextEditor content={storyAr} onChange={setStoryAr} placeholder="…" maxHeight="300px" />
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Témoignages sélectionnés</h4>
          <Button size="sm" variant="outline" onClick={() => setTestimonials([...testimonials, { author: "", quote: "" }])} className="text-white border-white/20 hover:bg-white/10 hover:text-white">
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
        {testimonials.map((t, i) => (
          <div key={i} className="rounded-md border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Auteur" value={t.author} onChange={(e) => {
                const copy = [...testimonials]; copy[i] = { ...copy[i], author: e.target.value }; setTestimonials(copy);
              }} className="bg-white/10 border-white/20 text-white" />
              <Input placeholder="Ville/Pays (optionnel)" value={t.location || ""} onChange={(e) => {
                const copy = [...testimonials]; copy[i] = { ...copy[i], location: e.target.value }; setTestimonials(copy);
              }} className="bg-white/10 border-white/20 text-white" />
              <Button size="icon" variant="ghost" onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))} className="text-white/70 hover:text-white shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea placeholder="Citation…" value={t.quote} onChange={(e) => {
              const copy = [...testimonials]; copy[i] = { ...copy[i], quote: e.target.value }; setTestimonials(copy);
            }} className="bg-white/10 border-white/20 text-white" rows={2} />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <h4 className="font-semibold">Appels à l'action (direct — pas de redirection OTA)</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-white/80">WhatsApp (numéro)</Label>
            <Input value={cta.whatsapp || ""} onChange={(e) => setCta({ ...cta, whatsapp: e.target.value })} placeholder="+212…" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">Téléphone</Label>
            <Input value={cta.phone || ""} onChange={(e) => setCta({ ...cta, phone: e.target.value })} placeholder="+212…" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">Email</Label>
            <Input value={cta.email || ""} onChange={(e) => setCta({ ...cta, email: e.target.value })} placeholder="contact@…" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">URL Réservation directe</Label>
            <Input value={cta.reserve_url || ""} onChange={(e) => setCta({ ...cta, reserve_url: e.target.value })} placeholder="https://…" className="bg-white/10 border-white/20 text-white" />
          </div>
          <div>
            <Label className="text-white/80">Libellé bouton principal</Label>
            <Input value={cta.primary_label || ""} onChange={(e) => setCta({ ...cta, primary_label: e.target.value })} placeholder="Réserver / Contactez-nous" className="bg-white/10 border-white/20 text-white" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer le site vitrine
        </Button>
      </div>
    </div>
  );
};

export default AffiliateShowcaseSiteEditor;
