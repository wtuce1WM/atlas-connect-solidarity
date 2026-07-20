import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageCircle, Phone, Mail, ExternalLink } from "lucide-react";
import { trackBusinessEvent } from "@/lib/businessAnalytics";

interface ShowcaseData {
  id: string;
  business_id: string;
  enabled: boolean;
  canonical_url: string | null;
  tagline_fr: string | null;
  tagline_en: string | null;
  tagline_ar: string | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  story_fr: string | null;
  story_en: string | null;
  story_ar: string | null;
  testimonials: Array<{ author: string; quote: string; location?: string }>;
  cta_config: {
    whatsapp?: string;
    phone?: string;
    email?: string;
    reserve_url?: string;
    primary_label?: string;
  };
  business?: {
    name: string;
    slug: string | null;
    city: string | null;
    country: string | null;
    address: string | null;
  };
}

const ShowcaseSite = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      // Resolve business by slug
      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, slug, city, country, address")
        .eq("slug", slug)
        .maybeSingle();
      if (!biz) { setNotFound(true); setLoading(false); return; }

      const { data: showcase } = await (supabase as any)
        .from("business_showcase_site")
        .select("*")
        .eq("business_id", biz.id)
        .eq("enabled", true)
        .maybeSingle();

      if (!showcase) { setNotFound(true); setLoading(false); return; }
      setData({ ...showcase, business: biz });
      setLoading(false);
      trackBusinessEvent(biz.id, "view", { subtype: "showcase" });
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white flex-col gap-4">
        <p className="text-lg">Site vitrine introuvable.</p>
        <Link to="/" className="text-primary underline">Retour à l'accueil</Link>
      </div>
    );
  }

  const b = data.business!;
  const tagline = data.tagline_fr || "";
  const story = data.story_fr || "";
  const heroMedia = data.hero_video_url || data.hero_image_url;
  const isVideo = !!data.hero_video_url;
  const canonicalUrl = data.canonical_url || `https://oneworldmorocco.com/site/${slug}`;
  const primaryCta = data.cta_config?.primary_label || "Nous contacter";

  const waLink = data.cta_config?.whatsapp
    ? `https://wa.me/${data.cta_config.whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  return (
    <>
      <Helmet>
        <title>{b.name} — {b.city || "Maroc"}</title>
        <meta name="description" content={tagline || `${b.name} — site officiel`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={b.name} />
        <meta property="og:description" content={tagline} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        {data.hero_image_url && <meta property="og:image" content={data.hero_image_url} />}
      </Helmet>

      <div className="min-h-screen bg-[#0F0E0C] text-white font-sans">
        {/* Hero */}
        <section className="relative h-[80vh] min-h-[500px] w-full overflow-hidden">
          {heroMedia && isVideo ? (
            <video src={data.hero_video_url!} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : heroMedia ? (
            <img src={heroMedia} alt={b.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#C04F17]/40 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
          <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-16 max-w-5xl">
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
              {b.name}
            </h1>
            {tagline && <p className="text-xl md:text-2xl text-white/90 max-w-2xl">{tagline}</p>}
            {b.city && (
              <p className="mt-3 text-white/60 text-sm uppercase tracking-widest">{b.city}{b.country ? `, ${b.country}` : ""}</p>
            )}
          </div>
        </section>

        {/* Story */}
        {story && (
          <section className="max-w-3xl mx-auto px-6 py-20">
            <div
              className="prose prose-invert prose-lg max-w-none prose-headings:font-semibold prose-p:text-white/80 prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: story }}
            />
          </section>
        )}

        {/* Testimonials */}
        {data.testimonials?.length > 0 && (
          <section className="bg-white/[0.03] py-20 px-6">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="text-3xl md:text-4xl font-semibold text-center" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Ils en parlent
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                {data.testimonials.map((t, i) => (
                  <blockquote key={i} className="border-l-2 border-[#C04F17] pl-6">
                    <p className="text-lg text-white/90 italic">"{t.quote}"</p>
                    <footer className="mt-4 text-sm text-white/60">
                      — {t.author}{t.location ? `, ${t.location}` : ""}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold mb-8" style={{ fontFamily: "Montserrat, sans-serif" }}>
            {primaryCta}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-black font-medium hover:opacity-90">
                <MessageCircle className="h-5 w-5" /> WhatsApp
              </a>
            )}
            {data.cta_config?.phone && (
              <a href={`tel:${data.cta_config.phone}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium hover:opacity-90">
                <Phone className="h-5 w-5" /> Appeler
              </a>
            )}
            {data.cta_config?.email && (
              <a href={`mailto:${data.cta_config.email}`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 hover:bg-white/10">
                <Mail className="h-5 w-5" /> Email
              </a>
            )}
            {data.cta_config?.reserve_url && (
              <a href={data.cta_config.reserve_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C04F17] text-white font-medium hover:opacity-90">
                <ExternalLink className="h-5 w-5" /> Réserver
              </a>
            )}
          </div>
          {b.address && <p className="mt-8 text-sm text-white/50">{b.address}</p>}
        </section>

        {/* Footer signature 1WM */}
        <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-white/40">
          <Link to={`/fiche/${slug}`} className="hover:text-white/70">
            Powered by <span className="font-semibold">One World Morocco</span>
          </Link>
        </footer>
      </div>
    </>
  );
};

export default ShowcaseSite;
