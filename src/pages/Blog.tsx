import { useEffect, useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import HomeBottomBar from "@/components/HomeBottomBar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowRight, MapPin, Database } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS, ar } from "date-fns/locale";
import ratedHeroAsset from "@/assets/rated-businesses-hero.webp.asset.json";
import essaouiraSunsetAsset from "@/assets/essaouira-sunset-roof.jpg.asset.json";
import essaouiraLobsterAsset from "@/assets/essaouira-lobster-hero.jpg.asset.json";
import ideeCadeauHeroAsset from "@/assets/idee-cadeau-marrakech-hero.jpg.asset.json";

interface BlogPost {
  id: string;
  title_fr: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
}

const Blog = () => {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staticHeroes, setStaticHeroes] = useState<{ essaouira?: string; marrakech?: string; galeries?: string; fermes?: string; enfants?: string; artisanat?: string; streetfood?: string; fashion?: string; beachclubs?: string; hotelsessaouira?: string; sidikaouki?: string; agafay?: string; rated?: string; fruitsmer?: string; villas?: string; villasvac?: string }>({});

  useSEO({
    title: "Blog – Actualités et guides",
    description: "Articles, guides et actualités sur le Maroc par ONE WORLD MOROCCO.",
    canonical: "/blog",
  });

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title_fr, title_en, title_ar, slug, excerpt_fr, excerpt_en, excerpt_ar, cover_image_url, author_name, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (data) setPosts(data);
      setIsLoading(false);
    };
    fetchPosts();

    // Hero images for static blog cards (same logic as their pages)
    const fetchStaticHeroes = async () => {
      const KIDS_BADGE_ID = "645463af-f0a1-41f4-90c0-b79c5c74a09f";
      const [essRes, mrkRes, galRes, fermesRes, artisanatRes, ratedRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("images, services")
          .eq("city", "Essaouira")
          .eq("is_active", true)
          .order("priority_score", { ascending: false })
          .limit(20),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "83d7e07e-128c-47a3-92c6-225a53e34b42")
          .maybeSingle(),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "b484d0cd-6c47-43a2-b388-8ad34f590cd8")
          .maybeSingle(),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "2fdb1f15-4a02-40b4-b344-0ffc0c2e1abd")
          .maybeSingle(),
        supabase
          .from("businesses")
          .select("images")
          .eq("id", "1621498d-403b-4ff2-baf3-db45d1e5f41e")
          .maybeSingle(),
        supabase
          .from("businesses")
          .select("images")
          .eq("is_active", true)
          .or("google_review_count.gt.0,tripadvisor_review_count.gt.0,restaurant_guru_review_count.gt.0,rating.not.is.null")
          .order("priority_score", { ascending: false })
          .limit(1),
      ]);
      const seaKW = ["vue sur mer", "vue mer"];
      const essImg = essRes.data
        ?.find((b: any) =>
          b.images?.length &&
          b.services?.some((s: string) => seaKW.includes(s.toLowerCase()))
        )?.images?.[0];


      // Hero street food : même 1ʳᵉ fiche que le hero de l'article (1er entry)
      const { data: sfRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "6f48e2fa-bf01-4ce4-a51c-0e986ce17e18")
        .maybeSingle();
      const sfImg = (sfRow as any)?.images?.[0];

      // Hero shopping fashion Guéliz : même 1ʳᵉ fiche que le hero de l'article
      const { data: fashionRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "7924a190-679d-4981-a12a-b56c257cd680")
        .maybeSingle();
      const fashionImg = (fashionRow as any)?.images?.[0];

      // Hero beach clubs Marrakech : même 1ʳᵉ fiche que le hero de l'article
      const { data: beachRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "03dfb3bd-2021-418a-99d6-aec1fb0f7ac6")
        .maybeSingle();
      const beachImg = (beachRow as any)?.images?.[0];

      // Hero hôtels & riads vue mer Essaouira : même 1ʳᵉ fiche que le hero de l'article
      const { data: hotelsRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "4b4e42f7-d408-4c6d-989f-3922e2ed61d3")
        .maybeSingle();
      const hotelsImg = (hotelsRow as any)?.images?.[0];

      // Hero hébergements Sidi Kaouki : même 1ʳᵉ fiche que le hero de l'article (Mellow Beach House)
      const { data: skRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "04e08ef3-cd54-4091-876a-6822518c84a7")
        .maybeSingle();
      const skImg = (skRow as any)?.images?.[0];

      // Hero Agafay Dream : même 1ʳᵉ fiche que le hero de l'article (Stellar Agafay Desert Camp)
      const { data: agRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "e05a7ece-e417-4d65-b8a4-17a3ea4f96b3")
        .maybeSingle();
      const agImg = (agRow as any)?.images?.[0];

      // Hero Activités enfants Marrakech : même 1ʳᵉ fiche que le hero de l'article (Oasiria)
      const { data: enfRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "728e90f7-3894-43a5-8c0d-9dd193fe9946")
        .maybeSingle();
      const enfImg = (enfRow as any)?.images?.[0];

      // Hero Manger des fruits de mer à Essaouira : 1ʳᵉ fiche du hero (Chez Sam)
      const { data: fmRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "d00d119b-a5b2-492b-bdbd-f0872e5701d7")
        .maybeSingle();
      const fmImg = (fmRow as any)?.images?.[0];

      // Hero Louer une villa dans un complexe hôtelier à Marrakech : 1ʳᵉ fiche (Amanjena)
      const { data: villaRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "e7019579-408a-4b3c-90d7-41c6dbff9063")
        .maybeSingle();
      const villaImg = (villaRow as any)?.images?.[0];

      // Hero Louer une villa pour vos vacances à Marrakech : 1ʳᵉ fiche (Palm Agency Marrakech)
      const { data: villaVacRow } = await supabase
        .from("businesses")
        .select("images")
        .eq("id", "be1c1314-236c-46b6-8588-c390a0a54c31")
        .maybeSingle();
      const villaVacImg = (villaVacRow as any)?.images?.[0];

       setStaticHeroes({
        essaouira: essImg,
        marrakech: (mrkRes.data as any)?.images?.[0],
        galeries: (galRes.data as any)?.images?.[0],
        fermes: (fermesRes.data as any)?.images?.[0],
        enfants: enfImg,
        artisanat: (artisanatRes.data as any)?.images?.[0],
        streetfood: sfImg,
        fashion: fashionImg,
        beachclubs: beachImg,
        hotelsessaouira: essaouiraSunsetAsset.url,
        sidikaouki: skImg,
        agafay: agImg,
        rated: ratedRes.data?.[0]?.images?.[0],
        fruitsmer: essaouiraLobsterAsset.url,
        villas: villaImg,
        villasvac: villaVacImg,
      });
    };
    fetchStaticHeroes();
  }, []);

  const getTitle = (post: BlogPost) => {
    if (language === "ar" && post.title_ar) return post.title_ar;
    if (language === "en" && post.title_en) return post.title_en;
    return post.title_fr;
  };

  const getExcerpt = (post: BlogPost) => {
    if (language === "ar" && post.excerpt_ar) return post.excerpt_ar;
    if (language === "en" && post.excerpt_en) return post.excerpt_en;
    return post.excerpt_fr;
  };

  const getDateLocale = () => {
    if (language === "ar") return ar;
    if (language === "en") return enUS;
    return fr;
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />
      <div className="bg-black pt-28 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {t("blog.title")}
          </h1>
          <p className="text-white/60 mt-2">{t("blog.subtitle")}</p>
        </div>
      </div>

      <div className="w-full px-4 py-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {(() => {
              type Item = { key: string; date: string; node: JSX.Element };
              const items: Item[] = [];

              // Slugs that already have a hand-crafted static card below (with the right hero thumbnail).
              // We skip the DB version to avoid duplicate keys and empty thumbnails (cover_image_url is null in DB).
              const STATIC_CARD_SLUGS = new Set([
                "5-jours-marrakech-artisanat",
                "galeries-art-marrakech",
                "fermes-pedagogiques-marrakech",
                "idee-cadeau-marrakech",
                "louer-villa-complexe-hotelier-marrakech",
                "louer-villa-vacances-marrakech",
                "activites-enfants-marrakech",
                "artisanat-medina-marrakech",
                "street-food-marrakech",
                "shopping-fashion-gueliz",
                "beach-clubs-marrakech",
                "hotels-riads-vue-mer-essaouira",
                "manger-fruits-de-mer-essaouira",
                "hebergements-sidi-kaouki",
                "agafay-dream",
                "etablissements-notes",
              ]);

              posts.filter((p) => !STATIC_CARD_SLUGS.has(p.slug)).forEach((post) => {

                items.push({
                  key: post.id,
                  date: post.published_at || post.created_at,
                  node: (
                    <Link key={post.id} to={`/blog/${post.slug}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full relative">
                        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-primary/90 text-primary-foreground text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                          <Database className="h-2.5 w-2.5" /> dynamique
                        </span>
                        {post.cover_image_url && (
                          <div className="aspect-video overflow-hidden">
                            <img
                              src={post.cover_image_url}
                              alt={getTitle(post)}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <CardContent className="p-6">
                          <h2 className="text-xl font-semibold mb-3 line-clamp-2 font-['Playfair_Display'] italic">
                            {getTitle(post)}
                          </h2>
                          {getExcerpt(post) && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                              {getExcerpt(post)}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              {post.author_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {post.author_name}
                                </span>
                              )}
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(post.published_at), "d MMM yyyy", { locale: getDateLocale() })}
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ),
                });
              });


              // Carte Marrakech (la plus récente)
              items.push({
                key: "static-marrakech",
                date: "2026-05-23T00:00:00Z",
                node: (
                  <Link key="static-marrakech" to="/blog/5-jours-marrakech-artisanat">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.marrakech ? (
                          <img src={staticHeroes.marrakech} alt="Artisanat à Marrakech" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          5 jours à Marrakech pour découvrir le meilleur de l'artisanat marocain
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Itinéraire en 5 étapes — 31 adresses sélectionnées à Guéliz, dans la Médina, à Sidi Ghanem et au-delà.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });


              // Carte Galeries d'art Marrakech
              items.push({
                key: "static-galeries-marrakech",
                date: "2026-05-24T00:00:00Z",
                node: (
                  <Link key="static-galeries-marrakech" to="/blog/galeries-art-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.galeries ? (
                          <img src={staticHeroes.galeries} alt="Galeries d'art à Marrakech" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Les galeries d'art à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Notre sélection de 23 galeries d'art à Marrakech : Guéliz, Médina, Sidi Ghanem et au-delà.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Fermes pédagogiques Marrakech
              items.push({
                key: "static-fermes-marrakech",
                date: "2026-06-13T00:00:00Z",
                node: (
                  <Link key="static-fermes-marrakech" to="/blog/fermes-pedagogiques-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-green-50 to-lime-50 dark:from-green-950/30 dark:to-lime-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.fermes ? (
                          <img
                            src={staticHeroes.fermes}
                            alt="Les fermes pédagogiques à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Les fermes pédagogiques à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Trois adresses à quelques minutes de la ville ocre, pour une vraie journée de nature en famille — entre animaux, ateliers et plantes aromatiques.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Trouver une bonne idée cadeau à Marrakech
              items.push({
                key: "static-idee-cadeau-marrakech",
                date: "2026-06-22T08:00:00Z",
                node: (
                  <Link key="static-idee-cadeau-marrakech" to="/blog/idee-cadeau-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <img
                          src={ideeCadeauHeroAsset.url}
                          alt="Trouver une bonne idée cadeau à Marrakech"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Trouver une bonne idée cadeau à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Notre sélection de 47 adresses à Marrakech, du palais historique au showroom de créateur, pour rapporter un cadeau qui a du sens.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });




              // Carte Louer une villa dans un complexe hôtelier à Marrakech
              items.push({
                key: "static-villa-complexe-hotelier-marrakech",
                date: "2026-06-21T08:00:00Z",
                node: (
                  <Link key="static-villa-complexe-hotelier-marrakech" to="/blog/louer-villa-complexe-hotelier-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-stone-50 dark:from-amber-950/30 dark:to-stone-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.villas ? (
                          <img
                            src={staticHeroes.villas}
                            alt="Louer une villa dans un complexe hôtelier à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Louer une villa dans un complexe hôtelier à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Dix-huit adresses pour des vacances en famille à Marrakech, alliant l'isolement d'une villa privative aux services hôteliers d'un palace cinq étoiles.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Louer une villa pour vos vacances à Marrakech
              items.push({
                key: "static-villa-vacances-marrakech",
                date: "2026-06-21T10:00:00Z",
                node: (
                  <Link key="static-villa-vacances-marrakech" to="/blog/louer-villa-vacances-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.villasvac ? (
                          <img
                            src={staticHeroes.villasvac}
                            alt="Louer une villa pour vos vacances à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Louer une villa pour vos vacances à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Vingt-six adresses (villas privatives et agences spécialisées) pour louer une villa à Marrakech, et notre sélection vidéo des offres du moment.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Activités enfants Marrakech
              items.push({
                key: "static-activites-enfants-marrakech",
                date: "2026-06-14T00:00:00Z",
                node: (
                  <Link key="static-activites-enfants-marrakech" to="/blog/activites-enfants-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.enfants ? (
                          <img
                            src={staticHeroes.enfants}
                            alt="Activités pour les enfants à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Activités pour les enfants à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Quarante-deux adresses pour occuper les enfants à Marrakech : parcs aquatiques, trampolines, escape games, mini-villes éducatives, poneys, fermes et expériences immersives en famille.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Artisanat Médina Marrakech
              items.push({
                key: "static-artisanat-medina-marrakech",
                date: "2026-06-13T01:00:00Z",
                node: (
                  <Link key="static-artisanat-medina-marrakech" to="/blog/artisanat-medina-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.artisanat ? (
                          <img
                            src={staticHeroes.artisanat}
                            alt="Artisanat marocain dans la Médina de Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Artisanat marocain dans la Médina de Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Quarante ateliers et boutiques de la Médina — tapis berbères, caftans, poteries, marqueterie, maroquinerie, bijoux, savonnerie et galerie d'art — où l'artisanat marocain se vit encore au geste.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Médina de Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Street Food Marrakech
              items.push({
                key: "static-streetfood-marrakech",
                date: "2026-06-13T02:00:00Z",
                node: (
                  <Link key="static-streetfood-marrakech" to="/blog/street-food-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-red-50 to-yellow-50 dark:from-red-950/30 dark:to-yellow-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.streetfood ? (
                          <img
                            src={staticHeroes.streetfood}
                            alt="Street Food à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Le meilleur de la Street Food à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Trente-six adresses pour arpenter Marrakech la fourchette à la main — sandwichs minute, burgers gourmets, kefta bsmen, shawarmas, glaces maison et rooftop afro-berbère.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Shopping fashion Guéliz
              items.push({
                key: "static-shopping-fashion-gueliz",
                date: "2026-06-13T03:00:00Z",
                node: (
                  <Link key="static-shopping-fashion-gueliz" to="/blog/shopping-fashion-gueliz">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.fashion ? (
                          <img
                            src={staticHeroes.fashion}
                            alt="Shopping fashion à Guéliz, Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Shopping fashion à Guéliz, Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Vingt-trois boutiques mode à Guéliz : créateurs marocains, concept-stores pointus, marques internationales et adresses confidentielles dans l'épicentre fashion de Marrakech.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Guéliz, Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Beach Clubs à Marrakech
              items.push({
                key: "static-beach-clubs-marrakech",
                date: "2026-06-13T08:00:00Z",
                node: (
                  <Link key="static-beach-clubs-marrakech" to="/blog/beach-clubs-marrakech">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.beachclubs ? (
                          <img
                            src={staticHeroes.beachclubs}
                            alt="Beach Clubs à Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Beach Clubs à Marrakech
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Douze beach clubs autour de la ville ocre — oliveraies, piscines XXL, pool parties, tables festives et adresses 100 % femmes.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Marrakech
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Hôtels & Riads vue mer Essaouira
              items.push({
                key: "static-hotels-riads-vue-mer-essaouira",
                date: "2026-06-13T10:00:00Z",
                node: (
                  <Link key="static-hotels-riads-vue-mer-essaouira" to="/blog/hotels-riads-vue-mer-essaouira">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.hotelsessaouira ? (
                          <img
                            src={staticHeroes.hotelsessaouira}
                            alt="Hôtels & Riads avec vue sur mer à Essaouira"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Hôtels & Riads avec vue sur mer à Essaouira
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Trente-deux adresses face à l'Atlantique — riads de la médina, hôtels de la plage, villas de Moulay Bouzerktoun ou écolodges de Sidi Kaouki.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Essaouira
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Manger des fruits de mer à Essaouira
              items.push({
                key: "static-manger-fruits-de-mer-essaouira",
                date: "2026-06-20T08:00:00Z",
                node: (
                  <Link key="static-manger-fruits-de-mer-essaouira" to="/blog/manger-fruits-de-mer-essaouira">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.fruitsmer ? (
                          <img
                            src={staticHeroes.fruitsmer}
                            alt="Manger des fruits de mer à Essaouira"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Manger des fruits de mer à Essaouira
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Quinze adresses pour goûter à l'Atlantique, du port aux remparts — gastronomie marine, tables de médina, beach restaurants et l'incontournable marché au poisson.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Essaouira
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Hébergements Sidi Kaouki
              items.push({
                key: "static-hebergements-sidi-kaouki",
                date: "2026-06-13T11:00:00Z",
                node: (
                  <Link key="static-hebergements-sidi-kaouki" to="/blog/hebergements-sidi-kaouki">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.sidikaouki ? (
                          <img
                            src={staticHeroes.sidikaouki}
                            alt="Les meilleurs hébergements à Sidi Kaouki"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Les meilleurs hébergements à Sidi Kaouki
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Dix adresses pour dormir à Sidi Kaouki — éco-lodges, maisons d'hôtes en front de mer, hôtels de charme et surfhouses au sud d'Essaouira.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Sidi Kaouki
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Agafay Dream
              items.push({
                key: "static-agafay-dream",
                date: "2026-06-13T12:00:00Z",
                node: (
                  <Link key="static-agafay-dream" to="/blog/agafay-dream">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-stone-50 to-amber-50 dark:from-stone-950/30 dark:to-amber-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        {staticHeroes.agafay ? (
                          <img
                            src={staticHeroes.agafay}
                            alt="Agafay Dream — désert d'Agafay aux portes de Marrakech"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <MapPin className="h-16 w-16 text-primary" />
                        )}
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Agafay Dream
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Douze adresses pour vivre le désert d'Agafay à 45 minutes de Marrakech — éco-lodges, camps de luxe, tables panoramiques et aventures à dos de chameau, en Porsche, en e-bike ou en montgolfière.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Agafay
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });

              // Carte Établissements notés
              items.push({
                key: "static-etablissements-notes",
                date: "2000-01-01T00:00:00Z",
                node: (
                  <Link key="static-etablissements-notes" to="/blog/etablissements-notes">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                      <div className="aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <img
                          src={ratedHeroAsset.url}
                          alt="Établissements notés au Maroc"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-3 font-['Playfair_Display'] italic">
                          Établissements notés
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                          Le classement des établissements les mieux notés de notre sélection.
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <MapPin className="h-3 w-3" /> Maroc
                          </span>
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ),
              });






              return items
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((i) => <div key={i.key}>{i.node}</div>);
            })()}
          </div>
        )}
      </div>
      <Footer />
      <HomeBottomBar />
    </div>
  );
};

export default Blog;
