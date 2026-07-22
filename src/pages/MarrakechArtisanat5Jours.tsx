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
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, Star } from "lucide-react";
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

// 5 jours organisés par quartier — 44 adresses au total
const DAYS: { title: string; subtitle: string; ids: string[] }[] = [
  {
    title: "Jour 1 — Guéliz, le quartier créatif",
    subtitle:
      "On commence par la rue Yves Saint Laurent et ses concept stores : design contemporain, mode marocaine et art de vivre raffiné.",
    ids: [
      "83d7e07e-128c-47a3-92c6-225a53e34b42", // 33 rue Majorelle
      "a0418bbd-17f3-413c-adea-05e61306bcd0", // Chabi Chic Majorelle
      "17eed0b1-9bac-48bb-a09f-c61ffa484a07", // Marie Bastide
      "26152d49-2481-43b6-ab4e-f7201192acec", // Atelier Beni
      "f2735220-9627-4fe9-a94c-a29c22d7263b", // Some Slowconcept
      "f3de3d68-9dec-4547-869b-afe4fdb9bdda", // Boucherouite Rug
      "f675535d-72f1-46dc-a45a-007a4691539a", // Moro Boutique
      "318f88c8-209a-45cb-9094-9d2ed147f1aa", // Musée Pierre Bergé des Arts Berbères
    ],
  },
  {
    title: "Jour 2 — Médina, au cœur des souks",
    subtitle:
      "Cap sur la Médina pour rencontrer les figures historiques de la décoration et de l'artisanat marocain.",
    ids: [
      "5a400d85-03fd-451f-a9c5-f3aa65f1d6a5", // Mustapha Blaoui
      "641ab942-63a5-499e-999a-e09915b1d02f", // Boutique El Fenn
      "eb7d80b3-c4b1-45f4-8125-8ae989c7913d", // Chabi Chic Outlet Médina
      "1621498d-403b-4ff2-baf3-db45d1e5f41e", // Les Nomades de Marrakech
      "b17d355a-6fa6-47e7-8a0d-572764bb4375", // Dar Bouchaib
    ],
  },
  {
    title: "Jour 3 — Médina, galeries & tapis d'exception",
    subtitle:
      "Une journée dédiée aux galeries d'art, aux tapis berbères tissés à la main et aux pièces de collection.",
    ids: [
      "17469777-4da8-4d8f-957b-282b1c87dc7d", // Galerie Talsint
      "7bbaf3cf-59fc-4b11-9f02-e4c9b0402f4a", // El Ghali Art Gallery
      "9e0a2a43-5fc3-445b-92a8-6ffb9d9f42f2", // Soufiane Zarib
      "4e19dfb4-3a68-44ed-9476-f8d733aa90cc", // Tamegroute Pottery
      "5635c89e-62c9-47b0-be3e-2f73a1a13db0", // Boutique Stella Cadente Dar El Bacha
      "99da0b77-1ebc-47ee-a7d2-12bf43dbfcab", // Maison culturelle du tapis
      "1beba427-08aa-4aee-89b2-de3a6b7eef79", // Monde des Arts de la Parure (MAP)
      "dc157d9e-22f3-4d02-9988-1dc6eeb17c0b", // Musée de l'Élégance Marocaine
    ],
  },
  {
    title: "Jour 4 — Sidi Ghanem, le quartier des créateurs",
    subtitle:
      "La zone industrielle devenue le repère des designers et showrooms du Maroc contemporain.",
    ids: [
      "93099b79-d78a-4dd3-b62b-4e5f162a46fd", // Marrakine
      "7c757472-72ab-4381-811c-b31dc528a4a0", // Chabi Chic Showroom
      "63f8bace-ebae-4ce6-b486-7d5e7cf5b7f1", // The Boho Lab Marrakech
      "e4ed25c0-df39-4369-9e16-782a3d961ab3", // Maison Sarayan
      "1adaef64-6c0a-4eb2-affc-9d1ca2ebcbf1", // Azalaï Nomad Living
      "2dad597d-da8c-4a62-abac-af87c446b361", // Studio Lid
      "a739a50a-e81c-4561-bb60-acc8943b3547", // LRNCE
      "f2b8472f-97e1-4cd8-b18c-cbd77b8a12c0", // Soufiane Zarib Warehouse
      "b65d87eb-f35f-4c2b-a2bc-f274496bdd9c", // Côté Bougie Marrakech
      "f717da80-62cd-4306-adbf-ec17cda2138c", // Atelier Landon
      "65cbf91a-ebec-4b9f-88bc-dc5ba7d7218a", // La Marrakechoise
      "dc2a53f3-62ad-478e-984d-64fde2d85801", // The Food Bag Foundation
    ],
  },
  {
    title: "Jour 5 — Hors les murs",
    subtitle:
      "Les adresses en périphérie pour prolonger l'exploration au-delà du centre.",
    ids: [
      "5ce3d474-40d6-4847-9277-47d3c2482b38", // Maison Blaoui
      "cd8316e8-6393-4cd7-b649-e734ac87c0d9", // Studio Céramique
      "70867925-2132-44b6-8a8c-1f1963efcdfd", // Le Verre Beldi
      "e881d8af-d9f9-47bd-87da-049ea98fa936", // Popham design
      "440e90b7-f9a9-4617-a504-af7cda38317b", // Lamajestic Home
    ],
  },
  {
    title: "Inspirations en ligne",
    subtitle:
      "Les e-shops à parcourir pour prolonger l'expérience depuis chez soi.",
    ids: [
      "9799f930-a2bf-439a-9100-30d04fd7783e", // 33 rue Majorelle eShop
      "6876ac64-6fe5-45ca-89c4-d5691a84a887", // The Boho Lab eShop
      "57da6ab6-def6-40c0-ba8c-bf0589ba36bf", // Chabi Chic
      "4e84f395-d1b1-4691-ad4a-59be442e3d28", // Côté Bougie
      "cf00d804-1822-48d2-9908-b79ff73660ee", // Izdwan
      "7df95fe9-d655-4493-9c83-3d1bc5a0aa77", // Boussa du Maroc
    ],
  },
];

const ALL_IDS = DAYS.flatMap((d) => d.ids);
const SITE_URL = "https://oneworldmorocco.com";
const ARTICLE_PATH = "/blog/5-jours-marrakech-artisanat";
const ARTICLE_TITLE = "5 jours à Marrakech pour découvrir l'artisanat marocain";
const ARTICLE_DESCRIPTION =
  "Itinéraire de 5 jours à Marrakech : 44 adresses sélectionnées (Guéliz, Médina, Sidi Ghanem) pour découvrir le meilleur de l'artisanat marocain.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

const MarrakechArtisanat5Jours = () => {
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
            alt="Artisanat marocain à Marrakech"
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
              5 jours à Marrakech
              <br />
              <span className="text-gold">
                pour découvrir le meilleur de l'artisanat marocain
              </span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              Un itinéraire en 5 étapes — 44 adresses sélectionnées à Guéliz,
              dans la Médina, à Sidi Ghanem et au-delà — pour explorer les
              boutiques, ateliers et galeries qui font vivre l'artisanat
              marocain aujourd'hui.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {DAYS.map((day, dayIdx) => {
            const items = day.ids
              .map((id) => businesses[id])
              .filter(Boolean) as Business[];
            if (!items.length) return null;
            const isDark = dayIdx % 2 === 0;
            return (
              <section
                key={day.title}
                className={`py-14 ${isDark ? "bg-[#3B3B3B]" : "bg-background"}`}
              >
                <div className="container mx-auto px-4">
                  <h2
                    className={`text-2xl md:text-3xl font-bold mb-2 font-['Playfair_Display'] italic ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {day.title}
                  </h2>
                  <p
                    className={`mb-8 max-w-3xl ${
                      isDark ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {day.subtitle}
                  </p>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {items.map((b) => (
                      <Link
                        key={b.id}
                        to={businessUrl(b)}
                        id={`entry-${b.id}`}
                        onClick={() => {
                          try {
                            sessionStorage.setItem("returnToBlogPath", "/blog/5-jours-marrakech-artisanat");
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

export default MarrakechArtisanat5Jours;
