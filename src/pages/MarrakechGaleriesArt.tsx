import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocalizedNavigate } from "@/hooks/useLocalizedNavigate";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { businessUrl } from "@/lib/businessUrl";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, MapPin, Star, Sparkles } from "lucide-react";
import logoWatermark from "@/assets/logoGOLDsimpleSML.webp";

interface Business {
  id: string;
  name: string;
  slug: string | null;
  neighborhood: string | null;
  city: string | null;
  images: string[] | null;
  rating: number | null;
  categories: string[] | null;
  hook_fr: string | null;
  hook_en: string | null;
  hook_ar: string | null;
  wtuce_status: string | null;
  gamme_id: string | null;
}

interface Gamme {
  id: string;
  name_fr: string;
  color_hex: string | null;
}

// Galeries d'art à Marrakech, organisées par quartier
// Liste exactement les 24 résultats de la recherche "galeries d'art à marrakech"
const SECTIONS: { title: string; subtitle: string; ids: string[] }[] = [
  {
    title: "Guéliz — l'épicentre des galeries",
    subtitle:
      "Le quartier moderne concentre la majorité des galeries d'art contemporain de Marrakech : immeubles Art déco, vernissages et scène picturale en pleine effervescence.",
    ids: [
      "0125a0f2-d135-466d-915b-3806f3a885cb", // Librairie Booklore
      "17eed0b1-9bac-48bb-a09f-c61ffa484a07", // Marie Bastide Marrakech
      "0714e640-e346-4615-8152-039e0c60633f", // Loft Art Gallery Marrakech
      "aa6cf354-7e05-4349-ace4-6190c1f591de", // Comptoir des Mines Galerie
      "d34054f4-c338-42eb-ab62-316ea2025264", // Galerie 127
      "89b0d1e1-87eb-4459-8cae-e5f3b5a4a5c6", // Galerie Siniya28
      "ef6a07cd-0045-4a44-92db-05de78d854e2", // Matisse Art Gallery
      "d27a00db-168c-44dc-8037-089d8ec93ab5", // David Bloch Gallery
      "5a067e27-4a03-489f-965d-1a6ec907f463", // La Galerie 38
      "7d05266e-48b7-4452-9f08-510ab7471391", // La boutique du Jardin Majorelle
    ],
  },
  {
    title: "Médina — galeries au cœur des palais et riads",
    subtitle:
      "Demeures historiques et riads transformés en espaces d'exposition : ici, l'architecture elle-même devient une œuvre d'art.",
    ids: [
      "b484d0cd-6c47-43a2-b388-8ad34f590cd8", // Banksy Universe Marrakech
      "b6166ca2-0a61-42f2-99e4-447c2d7a88cb", // Museum in The Medina at Izza (Bab Doukkala)
      "22e7ba79-c9fb-4dc3-930a-243820f72d02", // Riad Yima Boutique & Art Gallery
      "528c004f-7fed-4020-a066-da81c132b645", // NoBorder Marrakech
    ],
  },
  {
    title: "Sidi Ghanem — ateliers et espaces avant-gardistes",
    subtitle:
      "Le quartier industriel devenu repère des designers : galeries et showrooms du Maroc contemporain.",
    ids: [
      "1109c9b7-1f45-47a7-bed6-5f0cfe5a0aa3", // D&CO Art Gallery
      "28dbe3de-f719-41a9-908e-2808d9ad869f", // Jajjah by Hassan Hajjaj
      "182051bb-cb32-455a-9f95-95d68d403dc9", // MCC Gallery
      "a739a50a-e81c-4561-bb60-acc8943b3547", // LRNCE
      "f4d5136a-09d5-4e1f-ad4b-697064040bbc", // De Bouche à Oreille
      "e0ff5293-49ed-43f1-a378-122750fed381", // Rigotang
    ],
  },
  {
    title: "Hors les murs",
    subtitle:
      "Quelques adresses en périphérie ou en ligne qui valent le détour pour les amateurs d'art.",
    ids: [
      "911e2d1c-34a3-43a2-976c-87a853cd3c42", // BLACKROOM ORENZO ART GALLERY (Route de l'Ourika)
      "61e9a244-f345-4431-a5a1-a88b19f97264", // Orenzo (Route de l'Ourika)
      "b9c63e43-40fd-4fa3-87be-2fc7d2714f2f", // Galerie 208
      "6119fc0e-f6d2-4720-a0aa-423513589dcd", // Jajjah eShop
    ],
  },
];

const ALL_IDS = SECTIONS.flatMap((s) => s.ids);
const SITE_URL = "https://oneworldmorocco.com";
const ARTICLE_PATH = "/blog/galeries-art-marrakech";
const ARTICLE_TITLE = "Les galeries d'art à Marrakech";
const ARTICLE_DESCRIPTION =
  "Notre sélection de 24 galeries d'art à Marrakech : Guéliz, Médina, Sidi Ghanem et au-delà. Art contemporain, design, photographie et scène picturale marocaine.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

const MarrakechGaleriesArt = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useLanguage();
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const seoImage =
    businesses[ALL_IDS[0]]?.images?.[0] ||
    businesses[ALL_IDS[1]]?.images?.[0] ||
    DEFAULT_OG_IMAGE;

  useSEO({
    title: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    canonical: ARTICLE_PATH,
    ogImage: seoImage,
    ogUrl: ARTICLE_PATH,
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: ARTICLE_TITLE,
      description: ARTICLE_DESCRIPTION,
      image: [seoImage],
      datePublished: "2026-06-12T08:00:00+01:00",
      dateModified: "2026-06-13T08:00:00+01:00",
      author: { "@type": "Organization", name: "ONE WORLD MOROCCO", url: SITE_URL },
      publisher: {
        "@type": "Organization",
        name: "ONE WORLD MOROCCO",
        logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${ARTICLE_PATH}` },
    },
  });

  useEffect(() => {
    const fetch = async () => {
      const [bizRes, gammeRes] = await Promise.all([
        supabase
          .from("businesses")
          .select(
            "id, name, slug, neighborhood, city, images, rating, categories, hook_fr, hook_en, hook_ar, wtuce_status, gamme_id"
          )
          .in("id", ALL_IDS)
          .eq("is_active", true),
        supabase.from("gammes").select("id, name_fr, color_hex"),
      ]);
      if (bizRes.data) {
        const map: Record<string, Business> = {};
        bizRes.data.forEach((b: any) => (map[b.id] = b));
        setBusinesses(map);
      }
      if (gammeRes.data) setGammes(gammeRes.data);
      setIsLoading(false);
    };
    fetch();
  }, []);

  // Restore scroll to previously clicked entry when returning from Search slidepanel
  useEffect(() => {
    if (isLoading) return;
    let scrollId: string | null = null;
    try {
      scrollId = sessionStorage.getItem("returnToBlogScrollId");
      if (scrollId) sessionStorage.removeItem("returnToBlogScrollId");
    } catch {}
    if (!scrollId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`entry-${scrollId}`);
      if (el) el.scrollIntoView({ behavior: "auto", block: "center" });
    });
  }, [isLoading]);

  const getHook = (b: Business) => {
    if (language === "ar" && b.hook_ar) return b.hook_ar;
    if (language === "en" && b.hook_en) return b.hook_en;
    return b.hook_fr || "";
  };

  const getGamme = (id: string | null) =>
    id ? gammes.find((g) => g.id === id) || null : null;

  const heroImage =
    businesses[ALL_IDS[0]]?.images?.[0] ||
    businesses[ALL_IDS[1]]?.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt="Galeries d'art à Marrakech"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4">
            <button
              onClick={() => navigate("/blog")}
              className="inline-flex items-center gap-2 text-white/60 hover:text-gold mb-4 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au blog
            </button>
            <h1 className="text-3xl md:text-5xl font-bold text-white font-['Playfair_Display'] italic leading-tight">
              Les galeries d'art
              <br />
              <span className="text-gold">à Marrakech</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              Notre sélection de 24 galeries — de Guéliz à Sidi Ghanem en
              passant par la Médina — pour explorer la scène artistique
              contemporaine de la ville ocre.
            </p>
          </div>
        </div>
      </div>

      {/* Suggestion IA */}
      <section className="bg-background py-10 border-b border-border/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-invert max-w-none text-foreground/80 text-base leading-relaxed">
            <p>
              Bienvenue dans la ville ocre, véritable épicentre de la créativité
              et de l'art contemporain en Afrique. Marrakech est une destination
              fascinante où l'art s'exprime à chaque coin de rue, mêlant
              traditions ancestrales et visions ultra-modernes. Explorez le
              quartier industriel de <strong className="text-black">Sidi Ghanem</strong> pour découvrir
              des ateliers de designers et des espaces d'exposition
              avant-gardistes. Pour une immersion totale, flânez dans le
              quartier de <strong className="text-black">Guéliz</strong>, qui regorge de galeries
              prestigieuses nichées dans des immeubles Art déco, offrant un
              regard unique sur la scène picturale marocaine. En <strong className="text-black">Médina</strong>,
              certains palais et demeures historiques se transforment souvent
              en centres culturels vibrants où l'architecture elle-même devient
              une œuvre d'art.
            </p>
            <p className="mt-4">Quelques conseils pour optimiser votre quête artistique :</p>
            <ul className="mt-2 space-y-1 list-disc pl-5">
              <li>
                Privilégiez les visites en fin de matinée pour profiter de la
                lumière naturelle exceptionnelle de la ville.
              </li>
              <li>
                Poussez les portes des lieux hybrides qui mélangent
                boutique-concept, salon de thé et exposition.
              </li>
              <li>
                Surveillez la programmation locale, de nombreux vernissages
                éphémères ont lieu tout au long de l'année.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {SECTIONS.map((section, idx) => {
            const items = section.ids
              .map((id) => businesses[id])
              .filter(Boolean) as Business[];
            if (!items.length) return null;
            const isDark = idx % 2 === 0;
            return (
              <section
                key={section.title}
                className={`py-14 ${isDark ? "bg-[#3B3B3B]" : "bg-background"}`}
              >
                <div className="container mx-auto px-4">
                  <h2
                    className={`text-2xl md:text-3xl font-bold mb-2 font-['Playfair_Display'] italic ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {section.title}
                  </h2>
                  <p
                    className={`mb-8 max-w-3xl ${
                      isDark ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {section.subtitle}
                  </p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.map((b) => (
                      <Link
                        key={b.id}
                        to={businessUrl(b)}
                        id={`entry-${b.id}`}
                        onClick={() => {
                          try {
                            sessionStorage.setItem("returnToBlogPath", ARTICLE_PATH);
                            sessionStorage.setItem("returnToBlogEntryId", b.id);
                          } catch {}
                        }}
                        className="group"
                      >
                        <Card className="overflow-hidden border-border/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 h-full">
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                            {b.images?.[0] ? (
                              <img
                                src={b.images[0]}
                                alt={b.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                {b.name}
                              </div>
                            )}

                            {b.wtuce_status === "verified" && (
                              <img
                                src={logoWatermark}
                                alt=""
                                className="absolute top-2 right-2 w-8 h-8 object-contain opacity-90 pointer-events-none"
                              />
                            )}

                            {b.rating && (
                              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
                                <Star className="h-3 w-3 fill-gold text-gold" />
                                <span className="text-gold font-bold text-xs">
                                  {b.rating}/20
                                </span>
                              </div>
                            )}

                            {(() => {
                              const g = getGamme(b.gamme_id);
                              return g ? (
                                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                                  <span
                                    className="text-[10px] text-black border border-black rounded-full px-1.5 py-0.5 whitespace-nowrap"
                                    style={{
                                      backgroundColor: g.color_hex || "#666",
                                    }}
                                  >
                                    {g.name_fr}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1">
                              {b.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {b.categories?.[0] && (
                                <span className="bg-muted rounded-full px-2 py-0.5">
                                  {b.categories[0]}
                                </span>
                              )}
                              {(b.neighborhood || b.city) && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {b.neighborhood || b.city}
                                </span>
                              )}
                            </div>
                            {getHook(b) && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                {getHook(b)}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </>
      )}

      <Footer />
    </div>
  );
};

export default MarrakechGaleriesArt;
