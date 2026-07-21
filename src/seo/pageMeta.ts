// Registry of per-route SEO meta. Key = route pattern (matches App.tsx <Route path="…">).
// Used by <RouteSeo /> (injected via react-helmet-async) and by the
// Backoffice "Pages" tab to display the meta description of each page.

export type PageMeta = {
  title: string;
  description: string;
  ogType?: "website" | "article";
  ogImage?: string;
};

const BRAND = "One World Morocco";

export const PAGE_META: Record<string, PageMeta> = {
  // Principales
  "/": {
    title: `La Première Plateforme Solidaire du Maroc — ${BRAND}`,
    description:
      "Découvrez hôtels, restaurants, activités et services sélectionnés au Maroc par One World Morocco.",
  },
  "/search": {
    title: `Recherche — ${BRAND}`,
    description:
      "Trouvez établissements, expériences et destinations au Maroc grâce à la recherche One World Morocco.",
  },
  "/carte": {
    title: `Carte interactive — ${BRAND}`,
    description:
      "Explorez tous les établissements sélectionnés au Maroc sur une carte interactive.",
  },
  "/hotels": {
    title: `Hôtels au Maroc — ${BRAND}`,
    description:
      "Recherchez et comparez les hôtels du Maroc avec disponibilités et prix en temps réel.",
  },
  "/blog": {
    title: `Blog — ${BRAND}`,
    description:
      "Articles, guides et inspirations de voyage au Maroc par One World Morocco.",
  },
  "/blog/:slug": {
    title: `Article — ${BRAND}`,
    description:
      "Découvrez nos articles, guides et inspirations sur le Maroc.",
  },
  "/videos": {
    title: `Vidéos — ${BRAND}`,
    description:
      "Vidéos immersives des plus belles adresses et expériences du Maroc.",
  },

  // Articles blog dédiés
  "/blog/5-jours-marrakech-artisanat": {
    title: `5 jours à Marrakech — artisanat — ${BRAND}`,
    description:
      "Itinéraire de 5 jours dédié à l'artisanat marrakchi : ateliers, souks et adresses authentiques.",
  },
  "/blog/galeries-art-marrakech": {
    title: `Galeries d'art à Marrakech — ${BRAND}`,
    description:
      "Notre sélection des galeries d'art contemporaines et traditionnelles à Marrakech.",
  },
  "/blog/fermes-pedagogiques-marrakech": {
    title: `Les fermes pédagogiques à Marrakech — ${BRAND}`,
    description:
      "Dix-sept adresses à quelques minutes de la ville ocre, pour offrir aux enfants — et aux parents — une vraie journée de nature, entre animaux, ateliers et plantes aromatiques.",
  },
  "/blog/louer-villa-complexe-hotelier-marrakech": {
    title: `Louer une villa dans un complexe hôtelier à Marrakech — ${BRAND}`,
    description:
      "Dix-huit adresses pour des vacances en famille à Marrakech, alliant l'isolement d'une villa privative aux services hôteliers d'un palace cinq étoiles.",
  },
  "/blog/louer-villa-vacances-marrakech": {
    title: `Louer une villa pour vos vacances à Marrakech — ${BRAND}`,
    description:
      "Vingt-six adresses (villas privatives et agences spécialisées) pour louer une villa à Marrakech, et notre sélection vidéo des offres du moment.",
  },
  "/blog/manger-fruits-de-mer-essaouira": {
    title: `Manger des fruits de mer à Essaouira — ${BRAND}`,
    description:
      "Quinze adresses pour goûter à l'Atlantique, du port aux remparts — gastronomie marine, tables de médina, beach restaurants et l'incontournable marché au poisson.",
  },
  "/blog/activites-enfants-marrakech": {
    title: `Activités pour les enfants à Marrakech — ${BRAND}`,
    description:
      "Quarante-deux adresses pour occuper les enfants à Marrakech : parcs aquatiques, trampolines, escape games, mini-villes, poneys, fermes pédagogiques, ateliers créatifs et expériences immersives en famille.",
  },
  "/blog/artisanat-medina-marrakech": {
    title: `Artisanat marocain dans la Médina de Marrakech — ${BRAND}`,
    description:
      "Huit ateliers et boutiques de la Médina — tapis berbères, caftans, poteries, maroquinerie, savonnerie et galerie d'art — où l'artisanat marocain se vit, se touche et se rapporte chez soi.",
  },
  "/blog/street-food-marrakech": {
    title: `Le meilleur de la Street Food à Marrakech — ${BRAND}`,
    description:
      "Trente-six adresses incontournables pour goûter la street food à Marrakech — du sandwich minute aux burgers gourmets, des kefta bsmen aux glaces maison, du shawarma au rooftop afro-berbère.",
  },
  "/blog/shopping-fashion-gueliz": {
    title: `Shopping fashion à Guéliz, Marrakech — ${BRAND}`,
    description:
      "Vingt-trois boutiques mode à Guéliz : créateurs marocains, concept-stores, marques internationales et adresses confidentielles dans l'épicentre fashion de Marrakech.",
  },
  "/blog/beach-clubs-marrakech": {
    title: `Beach Clubs à Marrakech — ${BRAND}`,
    description:
      "Douze beach clubs autour de Marrakech — oliveraies, piscines XXL, pool parties, tables festives et adresses 100 % femmes : notre sélection immersive pour vivre la ville ocre au bord de l'eau.",
  },
  "/blog/hotels-riads-vue-mer-essaouira": {
    title: `Hôtels & Riads avec vue sur mer à Essaouira — ${BRAND}`,
    description:
      "Trente-deux hôtels, riads, villas et écolodges à Essaouira et autour — tous avec vue sur l'océan : médina, plage, Sidi Kaouki, Moulay Bouzerktoun ou Diabat.",
  },
  "/blog/hebergements-sidi-kaouki": {
    title: `Les meilleurs hébergements à Sidi Kaouki — ${BRAND}`,
    description:
      "Dix adresses pour dormir à Sidi Kaouki — éco-lodges, maisons d'hôtes en front de mer, hôtels de charme et surfhouses : notre sélection immersive du village de surf au sud d'Essaouira.",
  },
  "/blog/agafay-dream": {
    title: `Agafay Dream — ${BRAND}`,
    description:
      "Douze adresses pour vivre le désert d'Agafay à 45 minutes de Marrakech — éco-lodges, camps de luxe, tables panoramiques, excursions Porsche, chameau, e-bike et survol en montgolfière.",
  },
  "/blog/ancien-accueil": {
    title: `Ancienne page d'accueil — ${BRAND}`,
    description: "Archive de l'ancienne page d'accueil One World Morocco.",
  },
  "/blog/typographie": {
    title: `Typographie — ${BRAND}`,
    description: "Démo et article sur la typographie One World Morocco.",
  },
  "/blog/icon-preview": {
    title: `Aperçu des icônes — ${BRAND}`,
    description: "Aperçu des icônes utilisées sur le site One World Morocco.",
  },

  // Autres
  "/ancien-index": {
    title: `Ancienne homepage — ${BRAND}`,
    description: "Archive de l'ancienne version de la homepage.",
  },
  "/test": {
    title: `Vidéos — ${BRAND}`,
    description: "Page de test interne (même contenu que /videos).",
  },
  "/search-analytics": {
    title: `Analytics recherche — ${BRAND}`,
    description: "Statistiques de recherche (accès interne).",
  },

  // Marque / corporate
  "/corporate": {
    title: `Corporate — ${BRAND}`,
    description:
      "Présentation institutionnelle de One World Morocco, plateforme du tourisme solidaire au Maroc.",
  },
  "/club": {
    title: `Club OWM — ${BRAND}`,
    description:
      "Découvrez le Club One World Morocco et ses avantages exclusifs.",
  },
  "/join": {
    title: `Rejoindre le Club OWM — ${BRAND}`,
    description:
      "Adhérez au Club One World Morocco et profitez de privilèges réservés aux membres.",
  },
  "/card": {
    title: `Carte OWM — ${BRAND}`,
    description: "Présentation de la carte One World Morocco.",
  },
  "/mission": {
    title: `Notre mission — ${BRAND}`,
    description:
      "La mission et les valeurs de One World Morocco : tourisme responsable et solidaire au Maroc.",
  },
  "/contact": {
    title: `Contact — ${BRAND}`,
    description: "Contactez l'équipe One World Morocco.",
  },
  "/devenir-affilie": {
    title: `Devenir affilié — ${BRAND}`,
    description:
      "Rejoignez le programme d'affiliation One World Morocco et valorisez votre établissement.",
  },

  // Footer / légal
  "/conditions-generales": {
    title: `Conditions générales — ${BRAND}`,
    description:
      "Conditions générales d'utilisation et de vente de One World Morocco.",
  },
  "/unsubscribe": {
    title: `Désabonnement — ${BRAND}`,
    description: "Désabonnez-vous des emails One World Morocco.",
  },
  "/install": {
    title: `Installer l'app — ${BRAND}`,
    description:
      "Guide d'installation de l'application One World Morocco sur votre appareil.",
  },

  // Taxonomies
  "/category/:categoryName": {
    title: `Catégorie — ${BRAND}`,
    description:
      "Découvrez les meilleures adresses du Maroc dans cette catégorie.",
  },
  "/subcategory/:subcategoryName": {
    title: `Sous-catégorie — ${BRAND}`,
    description:
      "Sélection d'établissements dans cette sous-catégorie au Maroc.",
  },
  "/service/*": {
    title: `Service — ${BRAND}`,
    description: "Découvrez les établissements proposant ce service au Maroc.",
  },

  // Géographie
  "/city/:city": {
    title: `Ville — ${BRAND}`,
    description:
      "Les meilleures adresses sélectionnées dans cette ville du Maroc.",
  },
  "/neighborhood/:neighborhood": {
    title: `Quartier — ${BRAND}`,
    description:
      "Les meilleures adresses sélectionnées dans ce quartier.",
  },
  "/destination/:destinationName": {
    title: `Destination — ${BRAND}`,
    description:
      "Découvrez cette destination du Maroc à travers nos sélections.",
  },

  // Fiches
  "/fiche/:slug": {
    title: `Fiche établissement — ${BRAND}`,
    description:
      "Fiche immersive d'un établissement sélectionné par One World Morocco.",
  },
  "/business/:slug": {
    title: `Établissement — ${BRAND}`,
    description:
      "Page établissement One World Morocco (redirection vers la fiche immersive).",
  },

  // Profils publics
  "/y/:slug": {
    title: `Chaîne YouTube — ${BRAND}`,
    description: "Page publique d'une chaîne YouTube référencée par One World Morocco.",
  },
  "/u/:pseudo": {
    title: `Profil membre — ${BRAND}`,
    description: "Profil public d'un membre du Club One World Morocco.",
  },
  "/:vanitySlug": {
    title: BRAND,
    description: "Redirection vanity One World Morocco.",
  },

  // Affiliés
  "/affiliates": {
    title: `Espace affiliés — Connexion — ${BRAND}`,
    description: "Connexion à l'espace affiliés One World Morocco.",
  },
  "/affiliates/reset-password": {
    title: `Réinitialiser le mot de passe — ${BRAND}`,
    description: "Réinitialisez le mot de passe de votre compte affilié.",
  },
  "/affiliates/dashboard": {
    title: `Dashboard affilié — ${BRAND}`,
    description: "Tableau de bord de votre espace affilié One World Morocco.",
  },
  "/affiliates/presence": {
    title: `Présence en ligne — ${BRAND}`,
    description: "Gérez la présence en ligne de votre établissement affilié.",
  },

  // Système — fallback neutre pour toute route non listée (backoffice, /studio-video,
  // /affiliates/*, /club, etc.). NE PAS mettre "Page introuvable" ici : ce titre
  // serait attribué à des pages réelles et polluerait les analytics comme des 404.
  // La vraie 404 (src/pages/NotFound.tsx) gère son propre titre via Helmet.
  "*": {
    title: BRAND,
    description:
      "One World Morocco — hôtels, restaurants, activités et expériences sélectionnés au Maroc.",
  },
};

