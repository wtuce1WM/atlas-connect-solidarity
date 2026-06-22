import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, hooks et avis clients des fiches
// des établissements dont une vidéo porte le badge « Idée Cadeau ».
const IDEES_CADEAUX: BlogArticleEntry[] = [
  {
    id: "f17c357f-8613-4503-a768-e7cbde0bcdcd",
    pretitle: "Médina de Marrakech — Dar el Bacha",
    title: "Bacha Coffee — l'écrin doré du café d'exception, à offrir comme un bijou",
    hours: "Ouvert tous les jours de 10h00 à 18h00 — fermé le lundi.",
    paragraphs: [
      "On pousse la porte de Dar el Bacha, on traverse une cour ombragée de grenadiers et d'orangers, et l'on entre dans ce que beaucoup considèrent comme l'un des plus beaux cafés historiques du monde. Bacha Coffee occupe les anciennes salles d'un palais marrakchi, et la mise en scène est totale : mosaïques, dorures, plateaux d'argent, serveurs en blanc et gants beurre frais qui circulent entre les tables comme dans un film des années 1930. Avant même de penser au cadeau, on prend une claque visuelle.",
      "L'idée cadeau, elle, tient en une image : la Collection Signature Nomad, ces coffrets illustrés aux finitions soignées qui ressemblent à des boîtes à bijoux, fermoir compris. À l'intérieur, des cafés 100 % Arabica venus de plus de trente-cinq pays, présentés en grains ou moulus, déclinés en plus de deux cents références. Chaque coffret raconte une destination, et l'on choisit le sien comme on choisirait un parfum — par l'origine, par la note dominante, par l'envie de voyage du moment.",
      "C'est précisément ce que met en scène la vidéo « Traveling the World through your Cup » et les capsules « Gifting 100 % Arabica Specialty Coffee » et « Gift Ideas for Ramadan » : le café devient un prétexte à offrir le monde. Les motifs imprimés sur les boîtes, le logo finement dessiné, le fermoir précieux — tout est pensé pour qu'au moment où l'on tend le cadeau, l'effet soit immédiat. Pour un anniversaire, un Ramadan, un retour de voyage ou un merci marquant, c'est l'un des présents les plus élégants qu'on puisse rapporter de Marrakech.",
      "Les habitués le savent : pour vivre l'expérience complète et déguster sur place avant d'acheter, mieux vaut arriver avant 9h30 et s'armer de patience. « Le café vaut le détour et la longue attente », résume Ellen ; « une expérience sans hâte », confirme Yasmin, qui rappelle qu'avec deux cents cafés au menu, on prend forcément son temps. La nourriture suit le niveau du lieu — pâtisseries incroyables, croissant aux framboises, omelette aux truffes — et l'on repart la cafetière à la main et le coffret sous le bras, avec ce sentiment d'avoir vécu un vrai moment, pas juste fait une course.",
      "Notre conseil : passer en fin de matinée pour la dégustation, puis terminer par la boutique. Les coffrets s'emportent en cabine, voyagent bien, et continuent de raconter Marrakech pendant des semaines, à chaque tasse, dans la cuisine de celui ou celle à qui on les a offerts.",
    ],
  },
  {
    id: "08f848fc-83ee-48c5-9636-fb80e68f0218",
    pretitle: "Souks de Marrakech — guidé par un local",
    title: "Tarik Belasri — l'expérience cadeau : ramener des babouches faites main, choisies comme un local",
    hours: "Visites guidées des souks et itinéraires personnalisés sur réservation.",
    paragraphs: [
      "On peut entrer dans les souks de Marrakech de deux manières : seul, en se faisant attraper par le premier rabatteur venu, ou avec quelqu'un comme Tarik Belasri. Guide local, créateur de contenu et photographe, Tarik a fait de la transmission du Maroc authentique sa marque de fabrique : sur son site, sur YouTube, et surtout sur le terrain, il accompagne voyageurs solos, couples et familles dans une découverte hors des clichés. « Comme si vous étiez accompagné par un ami sur place » — c'est son mot d'ordre, et c'est exactement ce qu'on ressent.",
      "Là où ses contenus prennent tout leur sens, c'est au moment du cadeau. Sa vidéo « Handmade baboushe in Marrakech » montre, sans filtre, comment se fabrique une babouche traditionnelle dans une échoppe de la médina : la coupe du cuir, l'assemblage, la couture à la main, les modèles brodés, les couleurs déclinées du blanc cassé au bleu Majorelle. On comprend en quelques minutes pourquoi ces chaussons sont l'un des plus beaux cadeaux qu'on puisse rapporter du Maroc — et pourquoi il vaut la peine d'aller les choisir au bon endroit, au bon prix, auprès du bon artisan.",
      "Avec Tarik, c'est précisément ce qu'on obtient : un itinéraire personnalisé selon l'envie du moment et le budget, des adresses cachées, des artisans qu'il connaît personnellement, et la garantie de ne pas payer le « prix touriste ». Babouches faites main, plateaux en cuivre martelé, lanternes ciselées, tapis berbères, céramiques de Tamegroute, huiles essentielles, épices, savons noirs : la liste des cadeaux possibles devient claire, et l'on choisit en connaissance de cause.",
      "L'autre option qu'il propose, et qu'on offre souvent comme cadeau d'expérience à un couple ou à des amis de passage à Marrakech : un shooting photo professionnel dans la médina, à Bahia, à la Koutoubia ou dans la palmeraie. On repart avec des images soignées, esthétiques, qu'on ne pourrait jamais obtenir au smartphone — et c'est, là encore, l'un de ces souvenirs qu'on continue d'offrir longtemps après le voyage.",
      "Pour qui veut transformer une simple journée shopping en un vrai moment, et repartir avec un cadeau dont on connaît l'histoire, l'adresse à contacter avant l'arrivée est celle-là. Tarik répond directement, sa pédagogie est simple, son énergie communicative, et l'on en ressort avec la sensation d'avoir compris Marrakech de l'intérieur — et d'avoir choisi un cadeau qui le raconte vraiment.",
    ],
  },
];

const IdeeCadeauMarrakech = () => (
  <BlogArticleTemplate
    entries={IDEES_CADEAUX}
    articlePath="/blog/idee-cadeau-marrakech"
    articleTitle="Trouver une bonne idée cadeau à Marrakech"
    articleDescription="Deux adresses sélectionnées par notre équipe pour rapporter de Marrakech un cadeau qui a du sens : le café d'exception en coffret signature de Bacha Coffee, et les babouches faites main choisies dans les souks avec Tarik Belasri."
    bookmarkSlug="idee-cadeau-marrakech"
    heroAlt="Idées cadeaux à Marrakech"
    heroTitleTop="Trouver une bonne idée cadeau"
    heroTitleBottom="à Marrakech"
    heroSubtitle="Deux adresses sélectionnées pour rapporter de Marrakech un cadeau qui a du sens : un coffret de café d'exception, ou des babouches faites main choisies comme un local."
    intro="Trouver le bon cadeau à Marrakech, c'est facile en apparence — les souks débordent — mais terriblement difficile en pratique : entre les imitations, les prix flottants et les milliers d'échoppes, on finit souvent par rapporter un objet qu'on n'aime déjà plus à l'aéroport. Voici deux adresses qui jouent dans une autre catégorie, repérées parce qu'une de leurs vidéos est explicitement consacrée à l'idée cadeau. Deux univers très différents — l'écrin doré d'un café historique d'un côté, l'authenticité du souk guidé par un local de l'autre — mais une même promesse : repartir avec un cadeau qu'on est fier d'offrir."
    datePublished="2026-06-22T08:00:00+01:00"
    dateModified="2026-06-22T08:00:00+01:00"
  />
);

export default IdeeCadeauMarrakech;
