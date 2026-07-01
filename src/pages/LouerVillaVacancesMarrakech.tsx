import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import BlogArticleTemplate, {
  type BlogArticleEntry,
  type BlogArticleVideo,
} from "@/components/blog/BlogArticleTemplate";

// Badge "Villas" id
const BADGE_VILLAS = "6a1b0b32-e325-4468-a0f6-e6da61e28c97";
// City ids — Marrakech + Agafay (alias géographique)
const CITY_IDS_MARRAKECH = [
  "41545fd3-2c2c-4609-8d55-842fd7e2edde",
  "e615a53d-568d-4cc1-85ea-7286571de35b",
];

// 18 villas (sous-catégorie par défaut = "Villas") + 8 agences immobilières
// (sous-catégorie par défaut = "Agences immobilières" avec service "Location vacances").
// 1 carte = 1 entité.
const ENTRIES: BlogArticleEntry[] = [
  // ===== VILLAS =====
  {
    id: "5c38b249-617a-4c08-b8ee-5cc1f26e0acc",
    pretitle: "Route de l'Ourika — villa privée, sérénité totale",
    title: "Villa Al Jannah — un cocon de luxe à louer pour la famille, sous le soleil de l'Ourika",
    paragraphs: [
      "Sur la route de l'Ourika, derrière ses hauts murs ocres, la Villa Al Jannah ouvre les portes d'une parenthèse hors du temps : soleil, sérénité et évasion. On y vient en famille pour avoir tout à soi — son jardin, sa piscine, ses chambres, ses repas pris dehors — sans cette logique d'hôtel où l'on partage espaces et silences avec d'autres voyageurs.",
      "C'est l'essence même de la location de villa privée à Marrakech : la maison comme refuge, le service à la demande, et le confort de savoir qu'on rentre chez soi le soir.",
    ],
  },
  {
    id: "21cad0dd-8447-4bfe-8e4e-6e1915c80bbe",
    pretitle: "Route de Ouarzazate — villas avec gouvernante et majordome",
    title: "Les Villas Seyana — le confort d'une maison, le service d'un palace",
    paragraphs: [
      "Dès l'arrivée aux Villas Seyana, on oublie le ménage et la cuisine : une gouvernante ou un majordome accueille la famille et reste disponible tout au long du séjour. Un concierge dédié orchestre les excursions, les massages à domicile, et veille à ce que chaque détail soit parfait.",
      "C'est l'idée d'une villa qu'on loue comme on louerait une grande maison de vacances — sauf que tout est testé, approuvé, et que personne dans la famille n'a à se soucier du quotidien.",
    ],
  },
  {
    id: "07203974-dbb4-4d5c-a3f8-d802c672de70",
    pretitle: "Route d'Amizmiz — 4 suites, piscine chauffée, sans vis-à-vis",
    title: "Villa Alanaé — quatre suites pour douze couchages, dans une oasis privée",
    paragraphs: [
      "Sur la route d'Amizmiz, la Villa Alanaé déploie quatre suites pour douze couchages, une piscine chauffée extérieure, un jardin clos, un mur végétal, un barbecue, une cheminée. Tout est pensé pour une famille élargie qui s'installe plusieurs jours et veut vivre dehors comme dedans.",
      "Le ménage est assuré ponctuellement, la cuisine est entièrement équipée, et le sans vis-à-vis garantit qu'on est vraiment chez soi. C'est l'archétype de la villa privative pour de vraies vacances en famille à Marrakech.",
    ],
  },
  {
    id: "4bc31868-d652-44a1-a2e6-6193f4bac15b",
    pretitle: "Route de Fès — lotissement intimiste de deux villas",
    title: "Misk Villas — deux villas jumelles, piscine privée chauffée, trois suites chacune",
    paragraphs: [
      "Sur la route de Fès, Misk Villas regroupe deux villas jumelles dans un même lotissement intimiste. Chaque villa dispose de sa piscine privée chauffée, sans vis-à-vis, et de trois suites — soit le format idéal pour une grande famille qui voudrait louer les deux en même temps pour rassembler tout le monde.",
      "C'est une formule rare à Marrakech : l'intimité d'une villa, multipliée par deux, pour les tribus qui veulent rester sous le même ciel sans se gêner.",
    ],
  },
  {
    id: "cffdefdf-476f-4fe5-86bd-a708df4bb141",
    pretitle: "Route de Ouarzazate — première ligne sur le golf",
    title: "Maison K — huit suites somptueuses dans une villa privée d'exception",
    paragraphs: [
      "Maison K, c'est l'une de ces adresses qu'on a envie de garder pour soi : une villa privée d'exception en première ligne du golf, à l'architecture élégante, dans l'un des quartiers les plus exclusifs de Marrakech. L'atmosphère est paisible, l'emplacement raffiné — et l'on s'y sent immédiatement chez soi.",
      "Avec ses huit suites somptueuses, ses espaces de réception, ses jardins et sa piscine privée, c'est l'endroit rêvé pour réunir toute la famille en louant la villa entière. Le luxe, ici, c'est de pouvoir tout privatiser.",
    ],
  },
  {
    id: "da6f9ba3-871b-4d1e-a2df-fa6cc842241c",
    pretitle: "Route de l'Ourika — au pied de l'Atlas, deux villas jumelles",
    title: "Dar Lemon & Dar Palm — 175 m² chacune, piscine chauffée 15×15 m et hammam, à 30 km de Marrakech",
    paragraphs: [
      "À 30 km de Marrakech, au pied de l'Atlas, Dar Lemon et Dar Palm sont deux villas jumelles de 175 m² entièrement privatives. Le domaine — trois hectares cerclés d'oliviers et d'orangers — abrite une piscine privée de 15 × 15 m et un espace spa avec hammam.",
      "Le petit-déjeuner est servi chaque matin par les équipes sur place : la famille n'a à se soucier de rien. C'est la location de villa au sens plein — un espace entièrement réservé, sans voisin de palier, où l'on vit comme à la maison, en mieux.",
    ],
  },
  {
    id: "32abe2a0-ce0a-4381-870d-030b29a81d10",
    pretitle: "Route d'Amizmiz — l'esprit Selman, dans une villa rien qu'à soi",
    title: "Villas Selman — l'art de vivre arabo-mauresque, jardin privé et piscine chauffée de 15 m",
    paragraphs: [
      "Aux Villas Selman, le luxe se marie à la quiétude : zelliges, tapis, boiseries, tissus brodés, salons à cheminée, dressings, salles de bains revêtues de zelliges. Chaque villa devient pour la durée du séjour une vraie maison marocaine d'exception, à l'image du palace Selman tout proche.",
      "Et à l'extérieur, chaque jardin privé abrite une piscine chauffée de 15 mètres. On est en famille, dans une vraie villa, avec tous les codes du palace marocain — sans avoir à partager quoi que ce soit.",
    ],
  },
  {
    id: "8a0b20f2-a77a-4b8d-8d9a-95181df3f542",
    pretitle: "Route de Ouarzazate — au cœur du Domaine Du Douar",
    title: "Villas du Domaine Du Douar — la villa privative au sein d'un domaine entièrement privatisable",
    paragraphs: [
      "Au cœur du Domaine Du Douar, derrière la palmeraie, les Villas du Domaine Du Douar offrent ce qu'on aime tant en famille : louer sa villa privative tout en profitant de la logistique d'un grand domaine — piscines, restaurant, tennis, pétanque, hammam, billard.",
      "Le domaine entier peut même se privatiser pour accueillir jusqu'à 74 personnes — l'option idéale pour une cousinade, un anniversaire ou un mariage de famille. C'est la villa qu'on loue, mais avec un village entier autour.",
    ],
  },
  {
    id: "4838a971-cf0b-4c93-8269-dc5e422687dd",
    pretitle: "Palmeraie — quatre villas privées dans une luxuriante palmeraie",
    title: "Dar JL — quatre villas de luxe pensées comme une résidence privée de design",
    paragraphs: [
      "Le Dar JL, c'est l'histoire d'une résidence privée conçue par un couple suédois passionné de design, qui a accueilli au fil des ans célébrités, familles royales et artistes. Depuis 2015, ce complexe de quatre villas de luxe nichées au cœur de la Palmeraie ouvre ses portes à ceux qui veulent vivre cette expérience.",
      "On y loue sa villa pour des vacances en famille, des mariages spectaculaires, ou des séjours de plusieurs jours à proximité du Golf de la Palmeraie. Le cadre est exceptionnel, les jardins luxuriants, et l'on se sent immédiatement à la maison.",
    ],
  },
  {
    id: "6ef5c99d-d4ce-4a46-aee8-269d5963cc5c",
    pretitle: "Palmeraie — 15 chambres, rooftop 360°, court de tennis",
    title: "Villa des 3 Golfs — la villa privatisable au cœur de la Palmeraie, pour de grandes tribus",
    paragraphs: [
      "Au cœur de la Palmeraie, la Villa des 3 Golfs est un havre de paix dont le vaste jardin d'oliviers et de palmiers abrite une piscine scintillante, un court de tennis en terre battue, un terrain de pétanque et une tente aménagée pour les retraites ou les événements privés.",
      "Composée de 15 chambres, elle peut être entièrement privatisée ou réservée à la chambre. Le rooftop panoramique à 360° offre des couchers de soleil suspendus entre la Palmeraie et l'Atlas — exactement le genre d'image qu'on garde longtemps après les vacances.",
    ],
  },
  {
    id: "e26af288-956d-46b3-b11a-107ccbe3f7c8",
    pretitle: "23 logements privatisables, restaurant et événements",
    title: "Villa Marco — la privatisation rare de 23 logements pour les très grandes familles",
    paragraphs: [
      "Villa Marco propose un format peu courant à Marrakech : la privatisation de 23 logements, l'accès à la piscine, un restaurant sur place, et la possibilité d'organiser des événements de toute taille. C'est la formule taillée pour les très grandes tribus, les retrouvailles familiales, ou les mariages qui rassemblent plusieurs générations.",
      "On loue ici un véritable petit domaine, avec la souplesse d'une villa qu'on s'approprie pendant tout le séjour.",
    ],
  },
  {
    id: "f6602acf-207d-48bc-bd30-3b6b30a79011",
    pretitle: "Route d'Amizmiz — l'une des plus belles villas de Marrakech",
    title: "Villa Taj Marrakech — l'iconique villa-événement avec piscine chauffée de 25 mètres",
    paragraphs: [
      "Depuis plus de 15 ans, Villa Taj Marrakech est reconnue comme l'une des villas événementielles les plus iconiques du Maroc. Une piscine chauffée de 25 mètres, des espaces de réception démesurés, une architecture devenue référence — l'endroit a vu défiler mariages d'exception, anniversaires inoubliables, séminaires, shootings, retraites yoga.",
      "Mais c'est aussi une villa qu'on loue, tout simplement, pour des vacances en famille hors normes — quand on a envie de poser ses valises dans l'une des plus belles villas de Marrakech.",
    ],
  },
  {
    id: "4824acbc-fa03-4164-840f-70cad982778c",
    pretitle: "Route de Ouarzazate — sur le parcours de golf Al Maaden",
    title: "Al Maaden VillaHotel & Spa — quatre catégories de villas d'inspiration marocaine moderne",
    paragraphs: [
      "Al Maaden VillaHotel & Spa offre quatre catégories de villas ouvertes sur le golf — Standard (2 chambres, 332 à 424 m², piscine privée de 35 m²), Privilège, Prestige et Présidentielle — bâties sur des terrains de 300 à 3000 m² et pouvant aller jusqu'à 700 m² habitables.",
      "Chaque villa dispose de son jardin, de sa piscine privée et d'équipements haut de gamme. C'est l'adresse parfaite pour des vacances où chaque famille trouve la villa correspondant exactement à sa taille — et à son envie.",
    ],
  },
  {
    id: "e8e78c87-9626-46e3-b874-e58860ad7f0a",
    pretitle: "Route de l'Ourika — refuge de charme à 6,5 km",
    title: "Les Jardins de Kesali — un refuge paisible aux portes de Marrakech",
    paragraphs: [
      "À seulement 6,5 kilomètres sur la route de l'Ourika, Les Jardins de Kesali invitent à une expérience exclusive où le charme marocain rencontre le luxe contemporain. Loin de l'agitation urbaine, tout en restant à proximité immédiate de Marrakech.",
      "Avec ses huit chambres élégantes, ses espaces de détente et son hospitalité chaleureuse, la villa devient pour la famille un véritable refuge — un lieu où chaque moment promet d'être mémorable.",
    ],
  },
  {
    id: "485ad341-e18b-4c7a-baa8-202117b81fb5",
    pretitle: "Villas que nous possédons, service que nous maîtrisons",
    title: "Villa Riad LYS — la gestion directe de villas par leur propriétaire, qualité contrôlée à 100 %",
    paragraphs: [
      "Lys Hospitality est une référence en location de villas à Marrakech, spécialisée dans les villas de luxe à Al Maaden et les riads haut de gamme. La particularité : ce sont les propriétaires directs qui conçoivent, entretiennent et gèrent chaque propriété. Pas d'intermédiaire, pas de mauvaise surprise.",
      "L'approche combine hospitalité privée, standards hôteliers de luxe, conciergerie sur-mesure et service premium 24/7. La famille loue une villa qu'on a pensée pour elle, et tout est sous contrôle.",
    ],
  },
  {
    id: "402708fe-7793-4b45-b7bf-8fc3e8267f27",
    pretitle: "Route de l'Ourika — à 20 minutes de Marrakech",
    title: "Les Roses by la Siredrah — 7 suites avec salles de bain privatives et deux piscines chauffées",
    paragraphs: [
      "Les Roses by la Siredrah, c'est une villa d'exception à 20 minutes de Marrakech, conçue pour des séjours en famille inoubliables. Sept chambres somptueuses, chacune avec salle de bain privative et dressing, s'ouvrent sur une vue imprenable sur la piscine.",
      "Deux piscines chauffées, espaces bien-être, jardins arborés : tout est pensé pour la détente collective. C'est la formule rare qui permet d'accueillir une famille très large sous un même toit, sans rien sacrifier au confort de chacun.",
    ],
  },
  {
    id: "fd0750ac-b38a-49cc-8d9b-1fbea033e967",
    pretitle: "Route de l'Ourika — décor élégant, hammam marocain, piscine chauffée",
    title: "Villa Minzah — 6 chambres avec salles de bain privatives, hammam et grande piscine",
    paragraphs: [
      "La Villa Minzah, sur la route de l'Ourika, déploie six chambres spacieuses, chacune avec sa salle de bain privative, autour d'un vaste salon à la décoration élégante et marocaine. Pour la détente ultime, un espace spa avec hammam traditionnel.",
      "Dehors, la grande terrasse révèle une piscine chauffée étincelante, entourée de chaises longues et de sièges confortables. C'est l'intimité totale pour des séjours inoubliables — la promesse exacte que cherche une famille en vacances.",
    ],
  },
  {
    id: "919bf6ff-6b11-421f-b387-ef8016161a75",
    pretitle: "1700 m² de paradis rien que pour vous",
    title: "Villa Marraktus Marrakech — 1700 m² privatifs pour des vacances sans contrainte",
    paragraphs: [
      "1700 m² de paradis rien que pour vous : voilà le pitch de la Villa Marraktus Marrakech. Un espace assez vaste pour qu'une famille s'y déploie sans jamais se gêner, avec tout ce qu'on attend d'une villa de vacances à Marrakech.",
      "C'est le format où l'on loue vraiment un lieu — pas une chambre, pas une suite — et où l'on vit ses vacances sur son propre rythme.",
    ],
  },

  // ===== AGENCES IMMOBILIÈRES (catalogue location vacances) =====
  {
    id: "c30cfbc8-6ec2-4b82-a7ec-29f40a4ad148",
    pretitle: "Agence — Hay Charaf",
    title: "Marrakech Villas — location de villas de luxe avec conciergerie personnalisée",
    paragraphs: [
      "Marrakech Villas propose un large catalogue de villas de luxe sélectionnées selon des critères rigoureux : luxe, confort, environnement enchanteur. L'agence accompagne la famille de la sélection à l'arrivée, avec un service de conciergerie personnalisé pour orchestrer le séjour.",
      "C'est l'option idéale quand on veut louer une villa privative à Marrakech sans avoir à tout chercher soi-même : un interlocuteur unique, une sélection vérifiée, et la garantie d'une vraie parenthèse en famille.",
    ],
  },
  {
    id: "e076a228-3bf8-45e7-a1ef-2c476072cc03",
    pretitle: "Agence — Hivernage",
    title: "My Private Villa Marrakech — l'art de recevoir, version location de villa de luxe",
    paragraphs: [
      "Bercés depuis leur plus jeune âge dans le monde hôtelier, les fondateurs de My Private Villa Marrakech ont mis leur art de recevoir au service de la location de villas de luxe à Marrakech. Approche personnalisée, prestataires sélectionnés parmi les meilleurs, équipe dédiée — la promesse est claire : efficacité, réactivité, professionnalisme.",
      "L'agence est un point de rencontre entre votre projet de vacances en famille et la villa qui le rendra possible.",
    ],
  },
  {
    id: "199d1963-1fec-405e-9f8a-b4c31572a3a6",
    pretitle: "Agence — Gueliz, spécialiste golf",
    title: "Marrakech Golf Location — villas et appartements sur les golfs de Marrakech",
    paragraphs: [
      "Marrakech Golf Location s'est spécialisée dans la location de villas et d'appartements sur les golfs de Marrakech, pour des vacances familiales ou des longs séjours. Service exclusif et personnalisé, accompagnement sur-mesure : on confie son projet à des passionnés de golf qui connaissent leurs adresses sur le bout des doigts.",
      "C'est l'option idéale pour les familles dont au moins un membre veut profiter des golfs marrakchis — sans renoncer à la villa privative pour tout le monde.",
    ],
  },
  {
    id: "be1c1314-236c-46b6-8588-c390a0a54c31",
    pretitle: "Agence — Route de Ouarzazate, 35 villas d'exception",
    title: "Palm Agency Marrakech — 35 villas de luxe et conciergerie sur mesure",
    paragraphs: [
      "Palm Agency a sélectionné 35 villas d'exception à Marrakech, rigoureusement choisies pour leur élégance, leur confort et leur emplacement. Installée à Marrakech depuis 2020 et forte d'une expérience de plus de 10 ans dans la location immobilière sur la Côte d'Azur, l'agence s'est imposée comme un acteur majeur de la promotion immobilière et de la gestion locative.",
      "La promesse est limpide : posez vos valises, détendez-vous, et laissez-nous nous occuper du reste. Conciergerie sur mesure, séjour sans contraintes, et la garantie d'une qualité de service irréprochable pour vos vacances en famille.",
    ],
  },
  {
    id: "a53b8ffa-e65a-474d-9722-a6369d4e0a44",
    pretitle: "Agence — sélection nationale de villas et riads",
    title: "Location Villas & Riads du Maroc — l'expertise multi-villes pour des vacances marocaines",
    paragraphs: [
      "Location Villas & Riads du Maroc fédère une sélection de villas et de riads couvrant plusieurs villes marocaines, dont Marrakech. L'agence accompagne les familles qui souhaitent louer une villa privative tout en gardant la flexibilité d'un interlocuteur unique pour leurs séjours au Maroc.",
      "C'est la formule pour ceux qui aiment l'idée de la villa, mais qui veulent une agence solide derrière pour cadrer le projet.",
    ],
  },
  {
    id: "a4cc4eea-252e-46d6-b621-bb26ba900aa5",
    pretitle: "Agence — Sidi Ghanem, services sur-mesure",
    title: "Villanovo Marrakech — villas et riads de luxe avec personnel de maison et chef cuisinier",
    paragraphs: [
      "Villanovo Marrakech propose des villas et riads de luxe à Marrakech (et Essaouira), pensés pour des séjours inoubliables, personnalisés et haut de gamme. La sélection est rigoureuse : intérieurs élégants, jardins magnifiques, piscines privées — pour des vacances en famille, entre amis ou en amoureux dans un cadre exceptionnel.",
      "Certaines résidences disposent de personnel de maison, d'un chef cuisinier à domicile et de services additionnels qui font basculer la location de villa du côté du palace privé.",
    ],
  },
  {
    id: "5cdc456a-51e6-4e35-8453-0deea8a3a6ba",
    pretitle: "Agence — couple installé au cœur de Marrakech",
    title: "Klair & Arno — l'agence en couple pour louer (ou gérer) son riad à Marrakech",
    paragraphs: [
      "Klair & Arno, c'est plus qu'une simple agence immobilière à Marrakech : un couple qui construit une relation de confiance, humaine et authentique, où chaque projet devient une histoire à vivre. Recherche du riad idéal en Médina, gestion locative, accompagnement clé en main — l'approche est exigeante et profondément ancrée localement.",
      "Pour des vacances en famille, on s'appuie sur leur connaissance fine de la Médina pour trouver le riad ou la villa qui correspondra exactement à l'esprit du séjour.",
    ],
  },
  {
    id: "cf365b1c-fcde-49fa-9e09-35addb89da9a",
    pretitle: "Agence — sélection internationale de villas et riads de luxe",
    title: "Le Collectionist — locations de riads et villas de luxe à Marrakech, signature internationale",
    paragraphs: [
      "Le Collectionist propose plus de 30 propriétés à Marrakech — riads cachés dans le tourbillon de la Médina et villas de luxe nichées dans la Palmeraie et au-delà. Suivez-les du désert à la Médina : ils créent vos vacances rêvées dans les plus belles locations de Marrakech.",
      "C'est la signature internationale du voyage chic à Marrakech : un dépaysement aux portes de l'Europe, et l'assurance d'une villa ou d'un riad sélectionné avec un œil aiguisé.",
    ],
  },
];

const ARTICLE_PATH = "/blog/louer-villa-vacances-marrakech";
const ARTICLE_TITLE = "Louer une villa pour vos vacances à Marrakech";
const ARTICLE_DESC =
  "Vingt-six adresses (villas privatives et agences spécialisées) pour louer une villa à Marrakech, et notre sélection vidéo des offres du moment.";

type VillaArticleTranslations = {
  title_fr: string | null;
  title_en: string | null;
  title_ar: string | null;
  content_fr: string | null;
  content_en: string | null;
  content_ar: string | null;
  hero_title_top_fr: string | null;
  hero_title_top_en: string | null;
  hero_title_top_ar: string | null;
  hero_title_bottom_fr: string | null;
  hero_title_bottom_en: string | null;
  hero_title_bottom_ar: string | null;
  hero_subtitle_fr: string | null;
  hero_subtitle_en: string | null;
  hero_subtitle_ar: string | null;
  intro_fr: string | null;
  intro_en: string | null;
  intro_ar: string | null;
  entries_fr: BlogArticleEntry[] | null;
  entries_en: BlogArticleEntry[] | null;
  entries_ar: BlogArticleEntry[] | null;
};

const VIDEO_SECTION_COPY = {
  fr: {
    title: "Les offres du moment",
    intro:
      "Une sélection de vidéos issues de notre base : villas mises en location par leurs propriétaires et agences spécialisées. Cliquez sur une vignette pour ouvrir la vidéo et faire défiler les offres verticalement.",
  },
  en: {
    title: "Current offers",
    intro:
      "A video selection from our database: villas rented by their owners and specialist agencies. Tap a thumbnail to open the video and browse offers vertically.",
  },
  ar: {
    title: "العروض الحالية",
    intro:
      "مجموعة مختارة من الفيديوهات من قاعدة بياناتنا: فيلات يؤجرها أصحابها ووكالات متخصصة. اضغط على الصورة المصغرة لفتح الفيديو وتصفح العروض عموديًا.",
  },
} as const;

const LouerVillaVacancesMarrakech = () => {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<BlogArticleVideo[]>([]);
  const [articleTranslations, setArticleTranslations] = useState<VillaArticleTranslations | null>(null);

  const pickLang = <T,>(frValue: T | null | undefined, enValue: T | null | undefined, arValue: T | null | undefined, fallback: T): T => {
    if (language === "ar" && arValue) return arValue;
    if (language === "en" && enValue) return enValue;
    return frValue || fallback;
  };

  const pickEntries = () => {
    if (!articleTranslations) return ENTRIES;
    const frEntries = Array.isArray(articleTranslations.entries_fr) && articleTranslations.entries_fr.length > 0
      ? articleTranslations.entries_fr
      : ENTRIES;
    if (language === "ar" && Array.isArray(articleTranslations.entries_ar) && articleTranslations.entries_ar.length > 0) {
      return articleTranslations.entries_ar;
    }
    if (language === "en" && Array.isArray(articleTranslations.entries_en) && articleTranslations.entries_en.length > 0) {
      return articleTranslations.entries_en;
    }
    return frEntries;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("title_fr, title_en, title_ar, content_fr, content_en, content_ar, hero_title_top_fr, hero_title_top_en, hero_title_top_ar, hero_title_bottom_fr, hero_title_bottom_en, hero_title_bottom_ar, hero_subtitle_fr, hero_subtitle_en, hero_subtitle_ar, intro_fr, intro_en, intro_ar, entries_fr, entries_en, entries_ar")
        .eq("slug", "louer-villa-vacances-marrakech")
        .maybeSingle();

      if (!cancelled) setArticleTranslations(data as unknown as VillaArticleTranslations | null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Internal video documents with badge Villas + price_type='location'
      const { data: badgedDocs } = await supabase
        .from("business_document_badges")
        .select("document_id")
        .eq("badge_id", BADGE_VILLAS);
      const docIds = (badgedDocs || []).map((d: any) => d.document_id);
      let internal: BlogArticleVideo[] = [];
      if (docIds.length > 0) {
        // Restrict to docs linked to Marrakech (or Agafay)
        const { data: docCities } = await supabase
          .from("business_document_cities")
          .select("document_id")
          .in("document_id", docIds)
          .in("city_id", CITY_IDS_MARRAKECH);
        const cityDocIds = Array.from(
          new Set((docCities || []).map((c: any) => c.document_id))
        );
        if (cityDocIds.length > 0) {
        const { data: docs } = await supabase
          .from("business_documents")
          .select(
            "id, business_id, name, description, price, price_type, url, youtube_video_url, instagram_video_url, tiktok_video_url, thumbnail_url, business_is_active"
          )
          .in("id", cityDocIds)
          .eq("type", "video")
          .eq("price_type", "location");
        const docs2 = (docs || []).filter((d: any) => d.business_is_active !== false);
        const bizIds = Array.from(new Set(docs2.map((d: any) => d.business_id).filter(Boolean)));
        const bizMap: Record<string, string> = {};
        if (bizIds.length > 0) {
          const { data: bizs } = await supabase
            .from("businesses")
            .select("id, name")
            .in("id", bizIds);
          (bizs || []).forEach((b: any) => (bizMap[b.id] = b.name));
        }
        internal = docs2.map((d: any) => {
          const url =
            d.youtube_video_url || d.instagram_video_url || d.tiktok_video_url || d.url || "";
          return {
            id: d.id,
            url,
            title: d.name || null,
            description: d.description || null,
            price: d.price || null,
            thumbnailUrl: d.thumbnail_url || null,
            isGeneric: false,
            businessId: d.business_id,
            businessName: bizMap[d.business_id] || null,
          };
        });
        }
      }

      // 2) Generic videos with badge Villas, filtrées sur Marrakech (+ Agafay)
      const { data: badgedGen } = await supabase
        .from("generic_video_badges")
        .select("generic_video_id")
        .eq("badge_id", BADGE_VILLAS);
      const genIdsAll = (badgedGen || []).map((g: any) => g.generic_video_id);
      let generic: BlogArticleVideo[] = [];
      if (genIdsAll.length > 0) {
        const { data: genCities } = await supabase
          .from("generic_video_cities")
          .select("generic_video_id")
          .in("generic_video_id", genIdsAll)
          .in("city_id", CITY_IDS_MARRAKECH);
        const genIds = Array.from(
          new Set((genCities || []).map((g: any) => g.generic_video_id))
        );
        if (genIds.length > 0) {
        const { data: gens } = await supabase
          .from("generic_videos")
          .select("id, title, name, description, url, thumbnail_url")
          .in("id", genIds);
        generic = (gens || []).map((g: any) => {
          return {
            id: g.id,
            url: g.url,
            title: g.title || g.name || null,
            description: g.description || null,
            price: null,
            thumbnailUrl: g.thumbnail_url || null,
            isGeneric: true,
            businessId: null,
            businessName: null,
          };
        });
        }
      }

      if (!cancelled) setVideos([...internal, ...generic]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const videoCopy = VIDEO_SECTION_COPY[language as keyof typeof VIDEO_SECTION_COPY] ?? VIDEO_SECTION_COPY.fr;

  return (
    <BlogArticleTemplate
      entries={pickEntries()}
      articlePath={ARTICLE_PATH}
      articleTitle={pickLang(articleTranslations?.title_fr, articleTranslations?.title_en, articleTranslations?.title_ar, ARTICLE_TITLE)}
      articleDescription={pickLang(articleTranslations?.content_fr, articleTranslations?.content_en, articleTranslations?.content_ar, ARTICLE_DESC)}
      bookmarkSlug="louer-villa-vacances-marrakech"
      heroAlt={pickLang(articleTranslations?.title_fr, articleTranslations?.title_en, articleTranslations?.title_ar, ARTICLE_TITLE)}
      heroTitleTop={pickLang(articleTranslations?.hero_title_top_fr, articleTranslations?.hero_title_top_en, articleTranslations?.hero_title_top_ar, "Louer une villa pour")}
      heroTitleBottom={pickLang(articleTranslations?.hero_title_bottom_fr, articleTranslations?.hero_title_bottom_en, articleTranslations?.hero_title_bottom_ar, "vos vacances à Marrakech")}
      heroSubtitle={pickLang(articleTranslations?.hero_subtitle_fr, articleTranslations?.hero_subtitle_en, articleTranslations?.hero_subtitle_ar, "Vingt-six adresses pour louer une villa privative à Marrakech : villas individuelles et agences spécialisées dans la location vacances. Et notre sélection vidéo des offres du moment.")}
      intro={pickLang(articleTranslations?.intro_fr, articleTranslations?.intro_en, articleTranslations?.intro_ar, "Louer une villa à Marrakech, c'est s'offrir le luxe rare de la maison de vacances : un toit à soi, un jardin, une piscine, des chambres qu'on partage entre proches, et la liberté de vivre sur son propre rythme. Deux familles d'adresses cohabitent ici : les villas individuelles (qu'on loue en direct au propriétaire ou à son équipe locale), et les agences immobilières spécialisées dans la location vacances, qui orchestrent les séjours et apportent une conciergerie sur mesure. Ces vingt-six adresses ont été sélectionnées pour leur sérieux, leur emplacement et la qualité de leur service — pour que vos vacances en famille à Marrakech commencent par la bonne porte.")}
      datePublished="2026-06-21T10:00:00+01:00"
      dateModified="2026-06-21T10:00:00+01:00"
      videoSection={{
        title: videoCopy.title,
        intro: videoCopy.intro,
        videos,
      }}
    />
  );
};

export default LouerVillaVacancesMarrakech;
