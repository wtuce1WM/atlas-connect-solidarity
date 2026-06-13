import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des hooks, descriptions, services, engagements,
// avis clients et horaires de chaque fiche Sidi Kaouki.
const HOTELS: BlogArticleEntry[] = [
  {
    id: "04e08ef3-cd54-4091-876a-6822518c84a7",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Mellow Beach House — maison d'hôtes éco-responsable face à l'océan",
    hours: "Maison d'hôtes — réception en continu, sur réservation.",
    paragraphs: [
      "À Sidi Kaouki, à une vingtaine de minutes au sud d'Essaouira, Mellow Beach House donne le ton du village : « Maison d'hôtes — restauration — coucher de soleil — yoga et surf — privatisation — événements et plus encore. » C'est le genre d'adresse où l'on vient pour quelques nuits et où l'on finit par prolonger.",
      "Construite dans le style traditionnel beldi en pierre, en terre et en bois, la maison est un véritable havre de paix écologique : électricité solaire, recyclage de l'eau, toilettes sèches et compostage font partie intégrante du confort. Sept chambres organisées autour de deux patios accueillent jusqu'à 22 personnes — idéal pour une privatisation famille ou groupe d'amis. La terrasse ouvre sur une vue imprenable sur l'océan et la campagne, avec coin feu de camp, canapé moelleux et petite piscine pour se rafraîchir entre deux sessions de surf. Une boutique propose même des articles locaux et recyclés.",
      "Côté prestations, on retient en priorité jardin, terrasse et vue sur mer. Logistique sur place : engagement éco-responsable affiché, transfert aéroport possible et parking clients.",
      "Côté retours clients, un avis résume bien l'expérience : « Nous sommes venus pour un séjour en famille en juillet dans cette maison incroyable. Le personnel est très gentil, toujours attentionné. Suite avec salles de bain, décorée avec goût, confortable, belle vue. Nous avons apprécié tous les bons plats. Merci à Aida & Nicolas pour leur accueil — nous recommandons à 100 % pour venir se détendre ! »",
      "Horaires & accueil : maison d'hôtes ouverte toute l'année, accueil sur réservation.",
    ],
  },
  {
    id: "32a52e2d-c71f-4c81-9f20-ea0c4dbec7ba",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Kasbah d'Eau — hôtel de charme perché sur la plage de Kaouki",
    hours: "Hôtel ouvert toute l'année, réception 24h/24, réservation obligatoire.",
    paragraphs: [
      "« Venez découvrir Kasbah d'Eau, un hôtel de charme situé en front de mer près d'Essaouira. » La signature plante le décor : ici on dort littéralement au-dessus de la plage, dans le village de Sidi Kaouki, à 16 km au sud d'Essaouira.",
      "Dix-sept chambres et suites climatisées offrent une vue imprenable sur la montagne, la plage et l'océan. Grande piscine chauffée, spa, salle de sport, restaurant et nombreuses activités sur le sable : surf, planche à voile, kitesurf pour les amateurs d'adrénaline, balades à cheval ou à dos de chameau, excursions en quad dans les dunes. La plage immédiate s'étend sur 2,5 km, et même aux heures les plus chargées, on y trouve le calme. Pour rejoindre la médina d'Essaouira, comptez 25 minutes en taxi — parfait pour un après-midi de shopping ou un dîner en ville avant de retrouver le silence du village.",
      "Côté prestations, on retient en priorité piscine, restauration sur place, accès direct plage, transfert aéroport et vue sur mer. Logistique sur place : parking clients, accessible aux personnes à mobilité réduite, réservation obligatoire.",
      "Côté retours clients : « Nous avons passé notre lune de miel ici, une expérience absolument merveilleuse. Le personnel nous a surpris avec une chambre décorée de pétales de roses. La vue était fantastique, s'endormir et se réveiller au son de l'océan était incroyablement apaisant. Faire du cheval au coucher du soleil… inoubliable. »",
      "Horaires & accueil : réception ouverte 24h/24, séjour de 3 nuits ou plus = 10 % de réduction en réservation directe.",
    ],
  },
  {
    id: "b7011817-aaf8-4b37-9ce3-40c4ae5773f4",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Rebali Riads — sept villas raffinées entre océan et arganiers",
    hours: "Hôtel ouvert toute l'année, réception 24h/24.",
    paragraphs: [
      "À Sidi Kaouki, Rebali Riads est cet « hôtel raffiné dans complexe de riads proposant jardins, piscines extérieures et spa avec hammam ». Sept villas posées à quelques pas de plages de sable fin, avec vues imprenables sur la côte et les montagnes.",
      "L'esprit : un magnifique hôtel de charme sur la côte marocaine, où l'on peut s'imprégner de la vie rurale marocaine ou partir explorer Essaouira (16 km), ses souks animés et ses remparts. Sur place, charmants jardins privés et partagés, plusieurs piscines, hammam et spa gérés par des professionnels, court de tennis. La plage en contrebas est idéale pour le surf et la planche à voile, et les balades à dos de chameau ou à cheval se réservent depuis la villa. Que l'on choisisse de louer une villa entière ou de séjourner dans une suite, le service discret garantit intimité et luxe à tous les hôtes.",
      "Côté prestations, on retient en priorité hammam et soins, piscine, jardin, terrasse, boutique et pavillons / villas individuelles. Logistique sur place : parking clients, accessible aux personnes à mobilité réduite, transfert aéroport (Essaouira à 15 min).",
      "Côté retours clients : « Endroit incroyable, beaucoup d'espace, extrêmement tranquille tout en étant à deux pas de la plage et de super cafés et petits restaurants. Personnel très attentionné. Si vous cherchez un endroit pour vous détendre après un voyage chargé ou un séjour à Marrakech, c'est l'endroit où aller. »",
      "Horaires & accueil : réception ouverte 24h/24, transferts organisés depuis Essaouira, Marrakech ou Agadir.",
    ],
  },
  {
    id: "ca2b9f3d-6e38-4aec-8602-27c199e98aaf",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Hôtel La Mouette et les Dromadaires — face à l'océan, dans la baie de Kaouki",
    hours: "Ouvert tous les jours, restaurant 12h–16h, hôtel accessible 24h/24.",
    paragraphs: [
      "« Loin de tout et proche de l'essentiel — plage, restaurant et hôtel face à l'océan à Sidi Kaouki. » Le hook de La Mouette et les Dromadaires dit l'essentiel : « Ici, le temps ralentit, l'océan dicte le rythme et chaque instant se savoure. »",
      "Au cœur de la baie de Sidi Kaouki, cette adresse mêle chambres, suite duplex et maison, toutes conçues pour des nuits bercées par le bruit des vagues. Le restaurant est la scène centrale : grandes tables communes, longs déjeuners décontractés, dîners en plein air, poissons grillés, poulpes, oursins — une cuisine de produits frais et locaux, enracinée dans les traditions méditerranéennes. Bar avec cocktails signature aux épices locales, carte de vins marocains et français. Côté bien-être : yoga face à l'océan au réveil, renforcement musculaire, soins relaxants — les thérapeutes et coachs maison accompagnent chaque envie.",
      "Côté prestations, on retient en priorité accès plage, restauration sur place, WiFi, yoga, massage, parking privé, service de transport, vue sur mer, et spectacles occasionnels.",
      "Côté retours clients : « Nous étions ici pour le déjeuner. L'endroit est absolument magnifique. Isolé, sauvage, océan et rochers — donnant une sensation d'ailleurs, toujours très civilisé. La nourriture était la meilleure que nous ayons mangée au Maroc jusqu'à présent. Service incroyable ! Et tout cela devant le spectacle des vagues. »",
      "Horaires & accueil : restaurant 12h–16h tous les jours, hôtel accessible 24h/24, réservation conseillée.",
    ],
  },
  {
    id: "b0470314-7266-4316-a534-2eda6622dec3",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Dav Mahal Eco Lodge — retraite de yoga et architecture transparente sur le Cap Sim",
    hours: "Eco-lodge ouvert toute l'année, séjour sur réservation.",
    paragraphs: [
      "Sur le fameux Cap Sim, balayé par les alizés et surplombant Ouassen, Dav Mahal Eco Lodge se présente comme une « retraite de yoga face à l'océan à Essaouira ». Olivier a acquis ce terrain de sable et de roches en 2011 et s'est laissé six années pour bien s'imprégner du lieu avant de bâtir.",
      "La résidence principale s'inspire de Richard Neutra et de ses architectures transparentes : la nature imprègne littéralement la maison. L'écologie est la valeur fondatrice — nuit possible dans un dôme en terre crue, hammam chauffé à l'énergie solaire, jardin où l'eau est recyclée pour l'arrosage. Le climat fait le reste : 320 jours de soleil par an, des températures entre 18 et 25 °C toute l'année, un accès direct à la plage. La cuisine se vit en concept ouvert : on cuisine soi-même ou on demande à la cuisinière maison, et le petit-déjeuner est compris dans la nuitée. Pour rejoindre le lodge depuis Essaouira : direction Ghazoua puis Agadir, panneau aéroport, à droite « Sidi Kaouki », puis 9 km de piste.",
      "Côté prestations, on retient en priorité yoga, vue sur mer, balades à dos de chameau ou à pied, bungalows / lodges individuels et parking. Logistique sur place : engagement éco-responsable revendiqué, WiFi.",
      "Côté retours clients : « Merci à tous — Rashida, Fatima, Naima, Hamid et Olivier — vous avez rendu mon séjour dans l'un des plus beaux endroits du Maroc vraiment incroyable. L'emplacement, la vue sur l'océan et les couchers de soleil spectaculaires rendent cet endroit vraiment unique. La conception est fluide, toutes les chambres étaient magnifiques. Les surfeurs étaient au coin de la rue, 6 à 8 tous les jours pendant une semaine. Fortement recommandé. »",
      "Horaires & accueil : éco-lodge ouvert toute l'année, séjour sur réservation.",
    ],
  },
  {
    id: "3451e277-20b1-47da-91cc-46d2e2b03a1d",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Kaouki Lodge — six chambres en pierre et chaux, niché entre village et arganiers",
    hours: "Maison d'hôtes ouverte toute l'année, sur réservation.",
    paragraphs: [
      "« Votre havre de paix loin de chez vous. » Le hook tient sa promesse : niché entre le charmant village de surfeurs de Sidi Kaouki et les forêts d'arganiers, le Kaouki Lodge est une escapade idéalement relaxante.",
      "Six chambres individuelles construites en pierre et en chaux selon les méthodes traditionnelles s'ouvrent sur une cour intérieure paisible. L'ameublement, en matériaux locaux, allie durabilité et confort. Vaste espace de vie principal pour regarder un film, coin lecture cosy avec quelques bons livres, terrasse ombragée au bord de la piscine pour le petit-déjeuner ou un apéritif au coucher du soleil. Le lodge est le point de départ idéal pour explorer les magnifiques plages de Kaouki, surfer, monter à cheval ou rejoindre la médina d'Essaouira.",
      "Côté prestations, on retient en priorité piscine, jardin, terrasse, restauration sur place et accueil maison d'hôtes. Logistique sur place : parking clients, transfert aéroport, accessible aux personnes à mobilité réduite.",
      "Côté retours clients : « J'ai récemment séjourné à Kaouki Lodge avec ma femme et mes deux adolescents. Joe a créé un endroit exceptionnel. Les chambres sont parfaites. Le jardin et la piscine sont magnifiques et Joe est extrêmement accueillant et serviable. Petits déjeuners délicieux et beaucoup de recommandations pour la région. Un endroit paradisiaque, je le recommande vivement. »",
      "Horaires & accueil : maison d'hôtes ouverte toute l'année, sur réservation.",
    ],
  },
  {
    id: "6ca0d188-d61b-4ca7-b6ba-ff78058bc1a1",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Villa Maya — onze chambres dans un parc verdoyant d'un hectare",
    hours: "Maison d'hôtes ouverte toute l'année, sur réservation.",
    paragraphs: [
      "Villa Maya est cette « somptueuse propriété en pierre » entièrement rénovée, posée près des magnifiques plages de Sidi Kaouki, à courte distance de l'aéroport d'Essaouira et du prestigieux golf de Mogador. Onze chambres pour une parenthèse de calme au cœur d'un parc verdoyant d'un hectare.",
      "Chaque chambre, de 13 à 40 m², est climatisée, équipée d'une salle de bains privative et de lits king size. On y déguste des repas exquis midi et soir, dans une salle voûtée au charme authentique ou à l'extérieur, au bord de la piscine et du bar. Parking fermé, WiFi gratuit, ambiance volontairement paisible. Note exceptionnelle de 5/5 sur Google et 9,2 sur Booking.com — la maison s'est forgé une réputation d'adresse-refuge.",
      "Côté prestations, on retient en priorité maison d'hôtes, piscine, restauration sur place et jardin. Logistique sur place : parking clients, accessible aux personnes à mobilité réduite, transfert aéroport.",
      "Côté retours clients : « Séjour parfait — un vrai bijou ! Dès le premier instant, accueil chaleureux et enregistrement sans problème. Complexe magnifique et bien entretenu, personnel extrêmement attentionné et sympathique. Emplacement idéal — calme, plutôt rural mais à courte distance en voiture de la plage pour le surf ou d'Essaouira pour le shopping ou le dîner. »",
      "Horaires & accueil : maison d'hôtes ouverte toute l'année, sur réservation.",
    ],
  },
  {
    id: "a45d8cc7-d1f6-4bfd-8407-01d8790fa97c",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Hotel Dar Boujdaa — guest house en front de mer, toute l'année",
    hours: "Maison d'hôtes ouverte toute l'année, sur réservation.",
    paragraphs: [
      "« Guest house unique en front de mer pour vos vacances, toute l'année. » Le hook de Dar Boujdaa résume la promesse : un pied dans le sable, ouvert quelle que soit la saison — parfait pour celles et ceux qui aiment Essaouira hors été, lorsque le vent tombe et que la lumière s'adoucit.",
      "L'adresse joue la carte de la simplicité front de mer : chambres avec terrasses, accès direct au sable, restauration sur place, jardin et rooftop pour profiter des couchers de soleil. L'idée est de ralentir, de marcher, de lire, de manger frais — exactement ce que l'on vient chercher à Sidi Kaouki.",
      "Côté prestations, on retient en priorité maison d'hôtes, vue sur mer, accès plage, restauration sur place, jardin, terrasse et rooftop. Logistique sur place : parking clients et transfert aéroport.",
      "Côté retours clients : « Charmante maison. J'avais une chambre privée avec salle de bain et ma propre petite terrasse donnant sur la mer. Mo et l'équipe ont préparé un excellent petit-déjeuner pour un séjour détendu, merci ! »",
      "Horaires & accueil : guest house ouverte toute l'année, sur réservation.",
    ],
  },
  {
    id: "a5f92d4c-7450-4c96-9190-b44db3539299",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Ouassane Surfhouse — la guesthouse 100 % surfeurs au village d'Ouassane",
    hours: "Surfhouse ouverte toute l'année, sur réservation.",
    paragraphs: [
      "« Guesthouse surf. Chambres privées et partagées • idéal pour les surfeurs • ambiance décontractée 🌊 » — le hook annonce clairement la couleur. Ouassane Surfhouse, c'est l'adresse de celles et ceux qui viennent pour la vague avant tout.",
      "Le concept : une maison d'hôtes au cœur du petit village d'Ouassane, à quelques minutes des spots de Sidi Kaouki et du Cap Sim. Chambres privées ou partagées, ambiance camp de surf décontractée, partage avec d'autres riders du monde entier. On y discute sessions, marées et boards autour d'un thé à la menthe, on charge tôt le matin, on récupère au calme l'après-midi.",
      "Côté prestations, on retient en priorité maison d'hôtes et surf house. Logistique sur place : parking clients et transfert aéroport.",
      "Côté retours clients : « Nous avons passé un séjour incroyable. Ouassane est un village vraiment authentique pour tous ceux qui veulent se déconnecter, se détendre et surtout surfer sur des vagues incroyables — il y a des spots pour tous les niveaux. Si vous aimez le surf, c'est l'endroit parfait. Confortable, bien situé, avec cuisine privée — très utile vu les options limitées pour manger dehors dans les petits villages. »",
      "Horaires & accueil : surfhouse ouverte toute l'année, sur réservation.",
    ],
  },
  {
    id: "9a9b7fda-d0d8-44b4-bc16-b0766834c21f",
    pretitle: "Sidi Kaouki, Essaouira",
    title: "Hotel Villa Soleil — l'hospitalité tranquille de Sidi Kaouki",
    hours: "Maison d'hôtes ouverte toute l'année, sur réservation.",
    paragraphs: [
      "Hotel Villa Soleil compose une autre facette de Sidi Kaouki : celle de la maison d'hôtes simple et chaleureuse, où l'on vient pour respirer, marcher et profiter d'un accueil personnel.",
      "Sur place, jardin, terrasse, restauration et parking privé : tout ce qu'il faut pour un séjour reposant, sans surenchère, à quelques minutes de la plage et du village. L'établissement est de ces adresses dont on garde le souvenir grâce à l'attention portée à chaque hôte plus qu'à un grand discours.",
      "Côté prestations, on retient en priorité maison d'hôtes, restauration sur place, jardin, terrasse et parking privé. Logistique sur place : parking clients, transfert aéroport.",
      "Côté retours clients : « Séjourner à l'Hôtel Villa Soleil a été une expérience ravissante. Le cadre est paisible et pittoresque, avec une ambiance vraiment agréable. Les chambres sont joliment décorées et très confortables. Ce qui ressort vraiment, c'est l'hospitalité : le personnel est chaleureux, serviable et toujours prêt avec un sourire. Un endroit parfait pour se détendre et profiter de la beauté du Maroc ! »",
      "Horaires & accueil : maison d'hôtes ouverte toute l'année, sur réservation.",
    ],
  },
];

const HebergementsSidiKaouki = () => (
  <BlogArticleTemplate
    entries={HOTELS}
    articlePath="/blog/hebergements-sidi-kaouki"
    articleTitle="Les meilleurs hébergements à Sidi Kaouki"
    articleDescription="Dix adresses pour dormir à Sidi Kaouki — éco-lodges, maisons d'hôtes en front de mer, hôtels de charme et surfhouses : notre sélection immersive du village de surf au sud d'Essaouira."
    bookmarkSlug="hebergements-sidi-kaouki"
    heroAlt="Les meilleurs hébergements à Sidi Kaouki"
    heroTitleTop="Les meilleurs hébergements"
    heroTitleBottom="à Sidi Kaouki"
    heroSubtitle="Dix adresses face à l'Atlantique, à 25 minutes au sud d'Essaouira — éco-lodges, riads, surfhouses et maisons d'hôtes en front de mer."
    intro="À 25 km au sud d'Essaouira, Sidi Kaouki est un village de bout du monde : une longue plage sauvage de 2,5 km, des dunes ondulantes, des arganiers, le Cap Sim qui ferme l'horizon et des alizés qui dictent le rythme. C'est le terrain de jeu des surfeurs, des cavaliers, des marcheurs et de celles et ceux qui viennent ralentir. Voici nos dix adresses pour y dormir — du grand éco-lodge perché sur le Cap Sim à la surfhouse décontractée d'Ouassane, en passant par les villas raffinées de Rebali Riads, l'hôtel-restaurant La Mouette et les Dromadaires ou la Kasbah d'Eau directement au-dessus de la plage."
    datePublished="2026-06-13T11:00:00+01:00"
  />
);

export default HebergementsSidiKaouki;
