import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { businessUrl } from "@/lib/businessUrl";
import HomeMindtripHeader from "@/components/home/HomeMindtripHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, MapPin, Star, Clock } from "lucide-react";
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
  wtuce_status: string | null;
}

// Texte immersif rédigé à partir des descriptions, avis clients et horaires de chaque fiche.
const FERMES: {
  id: string;
  pretitle: string;
  title: string;
  hours: string;
  paragraphs: string[];
}[] = [
  {
    id: "2fdb1f15-4a02-40b4-b344-0ffc0c2e1abd",
    pretitle: "À quelques minutes de Marrakech",
    title: "Domaine Bled Ouladi — la ferme de loisirs pensée pour les familles",
    hours: "Ouvert tous les jours, de 11h00 à 18h00 — sur réservation.",
    paragraphs: [
      "On quitte la ville ocre, on roule quelques minutes, et l'on bascule d'un coup dans un autre monde : celui d'un domaine arboré où l'eau de la piscine scintille déjà entre les feuillages, où le chant des oiseaux remplace le klaxon des scooters, et où l'on sent que la journée à venir va se vivre lentement. Bled Ouladi a été pensé comme une parenthèse familiale, un lieu où parents et enfants peuvent enfin déposer les valises mentales de la semaine.",
      "La matinée commence par la baignade. La piscine est grande, vraiment grande, et l'équipe a eu l'intelligence de réserver les transats aux adultes et aux ados — un petit luxe qui change tout : les enfants pataugent et rient sans qu'on ait à monter la garde, et l'on peut s'allonger en paix sous le soleil. Une couche de piscine est demandée pour les bébés, c'est la seule règle, et elle suffit à préserver l'ambiance.",
      "À 13h30, place au buffet à volonté. Le déjeuner est servi à l'ombre, dans un cadre verdoyant, et il a ce charme un peu désuet des repas de famille élargie : on prend le temps, on se ressert, on regarde les enfants qui repartent jouer entre deux plats. Les boissons ne sont pas comprises, on les commande à part, mais l'essentiel est là — on mange bien et l'on mange ensemble.",
      "Dès 15h30, l'après-midi prend une tournure pédagogique. Encadrés par l'équipe, les enfants partent à la rencontre des animaux de la ferme : nourrissage, démonstration de la traite d'une vache, tour en charrette qui fait rire les plus grands autant que les plus petits. Puis viennent les ateliers manuels, inclus dans la formule : peinture sur poterie traditionnelle, fabrication de bracelets — autant de petits objets faits main qu'on ramène à la maison comme des trophées.",
      "On repart en fin d'après-midi un peu hâlé, les enfants épuisés mais radieux, avec ce sentiment rare d'avoir vraiment passé une journée ensemble. C'est exactement ce que Bled Ouladi promet, et c'est exactement ce qu'on y trouve.",
    ],
  },
  {
    id: "e499ba31-7ac5-4fe9-8685-480e89a5e97d",
    pretitle: "Km 6, Route de l'Ourika",
    title: "La Ferme El Dar — l'hospitalité marocaine au milieu des oliviers",
    hours: "Hôtel & restaurant ouverts toute la journée — réservation conseillée pour le déjeuner et les activités équestres.",
    paragraphs: [
      "Six kilomètres après les remparts, on quitte le bitume pour un chemin paisible bordé d'oliveraies. Au bout, une cour verdoyante, une lumière douce filtrée par les feuillages et la façade rustique de La Ferme El Dar. La transition est presque irréelle : on était à Marrakech il y a vingt minutes, on se retrouve dans une maison de campagne marocaine où le temps s'étire autrement.",
      "L'adresse est d'abord un hôtel & spa, mais elle vit aussi comme une vraie ferme : centre équestre, parc animalier, balades à cheval dans les oliveraies, piscine extérieure, hammam et soins traditionnels. On peut y dormir, mais on peut aussi venir pour la journée, déjeuner sous la pergola, faire le tour des enclos avec les enfants, monter en selle pour une balade encadrée — la formule s'adapte à l'envie du moment.",
      "À table, la cuisine marocaine est servie avec une générosité de maison familiale : tagines mijotés, légumes du potager, pain encore tiède, et une carte de vins étonnamment fournie pour un lieu qui se présente d'abord comme une ferme. On déjeune au jardin, en terrasse, face aux montagnes — le décor seul vaut le détour.",
      "Ce qu'on retient de La Ferme El Dar, au-delà des activités, c'est l'hospitalité. L'équipe a cette manière marocaine d'accueillir qui rend tout simple : on est attendu, on est reçu, on n'a plus rien à organiser. C'est l'adresse parfaite pour une journée à deux familles, ou pour offrir aux enfants un premier contact avec le cheval dans un cadre rassurant.",
    ],
  },
  {
    id: "6619e70c-aeed-4f60-b362-26157b4fe6a3",
    pretitle: "Vallée de l'Ourika, à 840 m d'altitude",
    title: "Jardin Bio-Aromatique d'Ourika — le premier jardin biologique du Maroc",
    hours: "Ouvert tous les jours, de 9h00 à 19h00 — visites libres ou guidées.",
    paragraphs: [
      "À une trentaine de kilomètres au sud de Marrakech, la route grimpe doucement vers la vallée de l'Ourika, là où le Haut Atlas commence à se dessiner. À 840 mètres d'altitude, au milieu d'un paysage berbère encore préservé, s'étend sur un hectare le premier Jardin Bio-Aromatique du Maroc — créé en 1998 par deux frères passionnés, le Dr Jalil Belkamel et le Dr AbdelFattah Belkamel, spécialistes des huiles essentielles.",
      "L'endroit n'a rien d'un jardin ornemental. C'est une collection vivante : une cinquantaine de plantes aromatiques, médicinales et ornementales, certaines endémiques, qu'on est invité à observer, à toucher, à sentir et même à goûter. Romarin, sauge, lavande, verveine, mais aussi des espèces rares qu'on ne croise nulle part ailleurs — chaque plante raconte une histoire de tradition, de phytothérapie ou de cuisine.",
      "On peut s'y promener librement, ou suivre une visite guidée — la seconde option transforme la balade en véritable cours d'aromathérapie. On y apprend les usages traditionnels et modernes de chaque plante, leurs vertus en cosmétique, en cuisine, en bien-être, et les différentes étapes de la distillation. Une distillerie est d'ailleurs installée sur place et fonctionne plusieurs fois par an pour extraire les huiles les plus précieuses.",
      "Le jardin est aussi le berceau de Nectarome, la marque de cosmétique naturelle qui en est née. Une boutique attenante permet de prolonger la visite par les sens : huiles essentielles, hydrolats, savons, huiles végétales d'argan ou de figue de barbarie. Premier employeur de la vallée avec plus de 70 salariés issus de la région, le jardin a aussi une vraie portée sociale.",
      "Pour les enfants, c'est une initiation parfaite à la botanique : on sent, on touche, on apprend en marchant. Pour les adultes, c'est un havre de paix, un endroit où ralentir et renouer avec ses cinq sens. À ne pas manquer en complément d'une journée dans la vallée de l'Ourika.",
    ],
  },
];

const ALL_IDS = FERMES.map((f) => f.id);

const FermesPedagogiquesMarrakech = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Record<string, Business>>({});
  const [isLoading, setIsLoading] = useState(true);

  useSEO({
    title: "Les fermes pédagogiques à Marrakech",
    description:
      "Notre sélection de fermes pédagogiques autour de Marrakech : Bled Ouladi, La Ferme El Dar, Jardin Bio-Aromatique d'Ourika. Ateliers, animaux, nature et plantes aromatiques en famille.",
    canonical: "/blog/fermes-pedagogiques-marrakech",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("businesses")
        .select(
          "id, name, slug, neighborhood, city, images, rating, categories, hook_fr, wtuce_status"
        )
        .in("id", ALL_IDS)
        .eq("is_active", true);
      if (data) {
        const map: Record<string, Business> = {};
        data.forEach((b: any) => (map[b.id] = b));
        setBusinesses(map);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  const heroImage =
    businesses[FERMES[0].id]?.images?.[0] ||
    businesses[FERMES[1].id]?.images?.[0];

  return (
    <div className="min-h-screen bg-background">
      <HomeMindtripHeader alwaysWhite />

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        {heroImage && (
          <img
            src={heroImage}
            alt="Fermes pédagogiques à Marrakech"
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
              Les fermes pédagogiques
              <br />
              <span className="text-gold">à Marrakech</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl text-lg">
              Trois adresses à quelques minutes de la ville ocre, pour offrir
              aux enfants — et aux parents — une vraie journée de nature, entre
              animaux, ateliers et plantes aromatiques.
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
          {/* Intro */}
          <section className="py-14 bg-background">
            <div className="container mx-auto px-4 max-w-3xl">
              <p className="text-foreground/80 text-lg leading-relaxed">
                Marrakech a beau être une ville d'effervescence, ses environs
                immédiats cachent quelques refuges de verdure où l'on respire
                autrement. Pour les familles, ces fermes pédagogiques sont une
                respiration nécessaire : un terrain de jeu grandeur nature où
                les enfants courent après les poules, donnent à manger aux
                ânes, plongent les mains dans la terre et apprennent — sans
                s'en rendre compte — d'où viennent les choses. Voici nos trois
                adresses préférées, toutes accessibles en moins d'une heure
                depuis la médina.
              </p>
            </div>
          </section>

          {FERMES.map((ferme, idx) => {
            const b = businesses[ferme.id];
            const isDark = idx % 2 === 0;
            return (
              <section
                key={ferme.id}
                className={`py-16 ${isDark ? "bg-black" : "bg-background"}`}
              >
                <div className="container mx-auto px-4 max-w-5xl">
                  <p
                    className={`text-sm uppercase tracking-wider mb-2 ${
                      isDark ? "text-gold/80" : "text-primary"
                    }`}
                  >
                    {ferme.pretitle}
                  </p>
                  <h2
                    className={`text-2xl md:text-4xl font-bold mb-6 font-['Playfair_Display'] italic leading-tight ${
                      isDark ? "text-white" : "text-foreground"
                    }`}
                  >
                    {ferme.title}
                  </h2>

                  {b && (
                    <Link
                      to={businessUrl(b)}
                      onClick={() => {
                        try {
                          sessionStorage.setItem(
                            "returnToBlogPath",
                            "/blog/fermes-pedagogiques-marrakech"
                          );
                          sessionStorage.setItem("returnToBlogEntryId", b.id);
                        } catch {}
                      }}
                      className="block group mb-8"
                    >
                      <Card className="overflow-hidden border-border/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                        <div className="grid md:grid-cols-2">
                          <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-muted">
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
                          </div>
                          <CardContent className="p-6 flex flex-col justify-center">
                            <h3 className="font-semibold text-xl text-foreground group-hover:text-primary transition-colors mb-2">
                              {b.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                              {b.categories?.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="bg-muted rounded-full px-2 py-0.5"
                                >
                                  {c}
                                </span>
                              ))}
                              {(b.neighborhood || b.city) && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {b.neighborhood || b.city}
                                </span>
                              )}
                            </div>
                            <p className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{ferme.hours}</span>
                            </p>
                            {b.hook_fr && (
                              <p className="text-sm text-foreground/70 italic">
                                « {b.hook_fr} »
                              </p>
                            )}
                          </CardContent>
                        </div>
                      </Card>
                    </Link>
                  )}

                  <div
                    className={`prose prose-lg max-w-none space-y-4 ${
                      isDark
                        ? "prose-invert text-white/85"
                        : "text-foreground/85"
                    }`}
                  >
                    {ferme.paragraphs.map((p, i) => (
                      <p key={i} className="leading-relaxed">
                        {p}
                      </p>
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

export default FermesPedagogiquesMarrakech;
