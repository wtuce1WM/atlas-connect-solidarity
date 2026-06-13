import BlogArticleTemplate, { type BlogArticleEntry } from "@/components/blog/BlogArticleTemplate";

// Texte immersif rédigé à partir des descriptions, hooks, avis clients et horaires de chaque fiche.
const ATELIERS: BlogArticleEntry[] = [
  {
    id: "1621498d-403b-4ff2-baf3-db45d1e5f41e",
    pretitle: "Face à la fontaine Ben Youssef, au cœur de la Médina",
    title: "Les Nomades de Marrakech — cinq générations de tapis berbères",
    hours: "Ouvert tous les jours, de 9h00 à 19h00.",
    paragraphs: [
      "On s'enfonce dans la Médina, on prend la ruelle qui mène à la fontaine Ben Youssef, et l'on pousse la porte d'un showroom qui n'a rien d'une boutique de souk : ici, tout est calme, presque solennel. Fondée en 1993 par Namous Abderrahim, cinquième génération d'une famille reconnue pour son expertise des tapis marocains haut de gamme, la maison Les Nomades de Marrakech a fait du tapis une affaire de transmission plus que de commerce.",
      "Les pièces sont tissées à la main par une équipe d'artisans qui travaillent la laine, le coton et — sur commande — la soie, teints exclusivement à partir de pigments naturels. Tapis berbères, kilims, couvertures, tentes nomades : chaque création prolonge des techniques amazighes transmises de mère en fille depuis des siècles. Sur place, on trouve des milliers de pièces uniques, certaines anciennes et chinées dans le Haut Atlas, d'autres tissées récemment dans les coopératives partenaires.",
      "L'accueil fait l'unanimité dans les avis : aucune pression, aucun « vous devez acheter », mais une vraie pédagogie. On vous explique la différence entre un Beni Ourain, un Boucherouite, un kilim Hanbel ; on vous parle des symboles, des régions, des laines selon les altitudes. « Abdul a été sympathique, patient et honnête, raconte une cliente. Il m'a beaucoup montré et expliqué les différentes qualités de tapis et les modes d'expédition. » Une autre, partie avec un petit budget de 350 euros, raconte avoir été emmenée dans la section vintage et avoir trouvé là « une pépite » qu'on lui a vendue au prix qu'elle pouvait — l'esprit maison, plus humain que commercial.",
      "L'adresse est aussi pensée pour les acheteurs venus de loin : le showroom organise lui-même l'expédition internationale, et les tapis arrivent généralement « environ trois semaines plus tard et fantastiques », comme le résume une cliente américaine. Plus qu'une boutique, c'est un seuil — celui par lequel on entre dans la vraie compréhension du tissage marocain.",
    ],
  },
  {
    id: "c17ebc87-c315-4dfa-bd93-53fe9462bd52",
    pretitle: "Au détour d'une ruelle de la Médina",
    title: "Woven Touch — tapis marocains, plaids et coussins faits main",
    hours: "Ouvert tous les jours, de 9h30 à 20h30.",
    paragraphs: [
      "On la trouve presque par hasard, au bout d'une ruelle qu'on n'aurait pas pensé prendre. Woven Touch est de ces adresses qu'on aime ramener à voix basse dans son carnet de Marrakech : une boutique compacte, lumineuse, qui aligne tapis marocains, plaids, coussins et accessoires de maison, tous faits main et tous choisis pour la qualité du tissage avant l'effet vitrine.",
      "Ce qui rend la visite mémorable, c'est Abdullah, qu'on retrouve cité dans presque tous les avis. « Il a partagé des informations très utiles sur les tapis et leur artisanat, a été très attentif à nos besoins et nous a guidés dans le choix d'une pièce magnifique. » L'écoute prend le pas sur la vente : on vous demande pour quelle pièce, quelle lumière, quel usage, avant de proposer — et le tapis finit emballé avec soin pour le vol retour.",
      "Le rapport qualité-prix séduit autant que la qualité de fabrication. Les tapis sont décrits comme « magnifiques et faits à la main avec beaucoup de soin et de détail », le personnel comme « incroyablement amical, patient et serviable, prenant le temps d'expliquer les différents designs et motifs ». Pour qui cherche un tapis authentique sans s'épuiser dans le marchandage des grandes artères du souk, c'est une halte précieuse.",
      "On en repart souvent avec plus qu'un tapis : un plaid berbère, deux coussins, parfois une couverture en laine brute — autant de pièces qui prolongent l'esprit de la Médina dans un salon parisien, new-yorkais ou londonien.",
    ],
  },
  {
    id: "3d5730c5-a0f9-4bde-970a-3cc1044dbd49",
    pretitle: "Dans les ruelles infinies du souk",
    title: "By Faissal — l'atelier où le métier à tisser n'a jamais cessé de tourner",
    hours: "Ouvert tous les jours, de 10h00 à 20h00.",
    paragraphs: [
      "On l'entend presque avant de le voir : ce cliquetis sec et régulier d'un métier à tisser en bois qui, quelque part dans la ruelle, continue d'exister à l'heure des t-shirts imprimés en série. Chez By Faissal, on tisse encore — vraiment — sur un métier traditionnel marrakchi, dans une boutique-atelier où l'on peut s'arrêter dix minutes pour observer le geste avant de regarder les pièces finies.",
      "La spécialité, ce sont les écharpes : en lin, en soie, en coton, en laine, déclinées dans une palette de teintes douces qui changent à chaque saison. Les voyageurs en parlent comme d'une « destination fortement recommandée dans les ruelles infinies de boutiques », et soulignent à peu près tous la même chose : des prix raisonnables affichés clairement, « sans qu'il soit nécessaire de marchander ». Pour Marrakech, c'est un confort rare.",
      "L'expérience tient autant à la qualité qu'à la transparence. On voit le tissage, on touche la matière, on comprend pourquoi une écharpe en lin du métier vaut le prix demandé. Les vêtements proposés en complément — kaftans légers, tuniques, vestes brodées — sortent de la même logique : « belles écharpes et vêtements de bonne qualité, j'ai acheté quelques articles et j'ai été tentée d'en acheter plus », raconte une cliente.",
      "C'est l'adresse à recommander à qui veut ramener un cadeau qui ait du sens : pas un souvenir générique, mais une pièce dont on peut dire, à Paris ou ailleurs, « elle a été tissée sous mes yeux à Marrakech ».",
    ],
  },
  {
    id: "f841aa06-c298-4b7a-b3d3-71f6afb9b1dd",
    pretitle: "Au cœur du souk de Marrakech, depuis 1981",
    title: "Maison du Caftan — l'élégance marocaine intemporelle, sur-mesure",
    hours: "Ouvert tous les jours, de 9h00 à 20h00.",
    paragraphs: [
      "Née en 1981 de la maison fondée par Haj Abdellah Benbrahim, la Maison du Caftan a vu défiler quatre décennies de mariées, de soirées de Aïd, de réceptions diplomatiques et de clientes venues du monde entier pour un seul caftan. L'atelier est tapi dans le souk, derrière une façade qui ne se remarque pas : c'est en franchissant la porte qu'on comprend pourquoi cette adresse fait référence.",
      "L'équipe réunit des artisans aguerris et de jeunes diplômés de l'école locale de design — un mélange revendiqué, qui se voit dans les collections. Caftans, takchitas, djellabas, tenues d'enfants, et même, à la périphérie, des nappes brodées, des draps, des mouchoirs en soie : tout sort des mêmes mains, dans une logique de commerce équitable et de pérennité du savoir-faire.",
      "Les clientes apprécient l'écoute. « J'ai acheté un caftan marocain en soie et un caftan pour enfant de 5 ans et un autre pour 2 ans. Le personnel est incroyable », raconte une visiteuse, séduite par la profondeur du catalogue : « Vous y trouverez à coup sûr une pièce unique à des prix raisonnables. » D'autres viennent pour le cachemire, une catégorie peu attendue mais soignée : « L'endroit idéal pour du cachemire de haute qualité », dit une cliente, en évoquant un gilet bleu de la collection d'hiver acheté auprès du directeur Omar.",
      "Pour beaucoup, c'est aussi un lieu de respiration. « De belles pièces, c'est un bon endroit pour regarder calmement toutes les options et décider ce que vous aimez » — loin du tumulte du souk, on prend le temps, on essaie, on revient. L'élégance marocaine, ici, n'est pas un costume : c'est un patrimoine vivant qu'on emporte avec soi.",
    ],
  },
  {
    id: "066d94c7-ed3a-4306-bfbf-abd3a208df7f",
    pretitle: "Dans la Médina, prix affichés sans marchandage",
    title: "Terra Mano — céramiques et poteries où chaque pièce a une histoire",
    hours: "Ouvert tous les jours, de 10h00 à 21h00.",
    paragraphs: [
      "On entre chez Terra Mano comme on entre dans une petite galerie : étagères en bois, lumière douce, et partout, des céramiques et des poteries qui semblent avoir été disposées une à une plutôt qu'alignées. La promesse du lieu tient en une phrase : céramiques et poteries artisanales, où chaque pièce raconte une histoire unique.",
      "Le travail mêle deux gestes traditionnels du Maroc : l'argile rouge de Marrakech et l'argile blanche du nord, chacune avec ses émaillages, ses cuissons, ses imperfections assumées. On y trouve aussi bien des tasses à thé, des bols et des plats du quotidien que des pièces plus rares — brûle-parfums, grands vases, photophores zellige — que l'on peut imaginer aussi bien sur une étagère de cuisine que sur une console contemporaine.",
      "Les avis parlent unanimement d'une expérience d'achat qui sort de l'ordinaire. « Miriam a été d'une grande aide et a expliqué les différents articles en argile rouge et en argile blanche. Tous les prix sont indiqués à côté des articles. Je reviendrai l'année prochaine », raconte une cliente. Une autre apprécie particulièrement la liberté du lieu : « Comme c'est un centre commercial, vous n'avez pas besoin de marchander, ce qui est un bon point pour les touristes européens. » Et puis il y a Mustafa, cité aussi, qui « emballe soigneusement chaque article » pour qu'il rejoigne Londres ou Berlin intact.",
      "Pour qui veut rapporter un objet qui résume Marrakech sans tomber dans le souvenir générique, c'est l'une des adresses les plus sûres de la Médina. On en repart toujours avec un peu plus que prévu — un brûle-parfum, deux tasses, un vase — et avec la sensation d'avoir choisi, pas acheté.",
    ],
  },
  {
    id: "9d7406ca-3515-4de7-a286-be8764799777",
    pretitle: "Atelier familial fondé en 1962, au cœur de la Médina",
    title: "Amaris Leather — soixante ans de maroquinerie marrakchie",
    hours: "Ouvert tous les jours, de 9h30 à 14h00 et de 15h30 à 20h00.",
    paragraphs: [
      "Amaris est un mot berbère qui signifie « perfection » : c'est sous ce nom qu'un atelier familial né en 1962 au cœur de la Médina perpétue, depuis plus de soixante ans, la tradition de la maroquinerie marocaine. Fondé par un père qui voulait inscrire son métier dans la longue durée, l'atelier se transmet aujourd'hui de père en fils, fidèle à la même obsession : un cuir choisi, un geste juste, une finition tenue.",
      "On vient ici pour des sacs, des ceintures, des poufs, des accessoires de petite maroquinerie, mais aussi pour la philosophie : matériaux écologiques, tannages traditionnels, finitions à la main. Chaque pièce résulte d'une collaboration entre plusieurs artisans marrakchis, et la marque revendique ouvertement les codes de la maroquinerie de luxe — sans en pratiquer les prix.",
      "L'identité du lieu se devine dès l'entrée : on est dans un vrai atelier, pas une vitrine. L'odeur du cuir, les outils sur l'établi, les pièces en cours sur un coin de table — tout dit le savoir-faire avant la décoration. C'est l'inverse exact des boutiques génériques du souk, et c'est ce qui en fait la valeur.",
      "L'horaire en deux temps — coupure méridienne entre 14h et 15h30 — rappelle d'ailleurs que la maison vit au rythme de la Médina, pas du tourisme. À garder pour une visite tranquille en fin de matinée ou en fin d'après-midi, quand l'équipe a le temps de raconter d'où vient chaque pièce.",
    ],
  },
  {
    id: "e57ec429-14bc-4c08-ad2a-6dcf19e900cc",
    pretitle: "Savonnerie artisanale depuis 2004",
    title: "L'Art Du Bain — la petite savonnerie unique de la Médina",
    hours: "Ouvert tous les jours, de 10h00 à 19h30.",
    paragraphs: [
      "Depuis 2004, L'Art Du Bain fabrique à Marrakech ses propres savons artisanaux : pains généreux découpés au fil, palette d'huiles essentielles, parfums qui changent au fil des saisons, et quelques variantes qu'on ne trouve nulle part ailleurs — dont un savon au lait de chamelle qui s'est fait une vraie réputation en ville.",
      "La boutique, calée dans une ruelle de la Médina, a ce charme un peu suranné des vieilles savonneries européennes : étagères en bois, savons empilés à la coupe, fragrances qui s'enroulent autour de vous dès qu'on pousse la porte. « On voit que c'est vraiment une boutique charmante et unique dans la Médina », résume une cliente venue, sur recommandation, acheter le fameux savon au lait de chamelle.",
      "Le rapport qualité-prix attire un public fidèle : on vient repartir avec trois ou quatre savons à offrir, plus un pour soi. Quelques avis pointent un bémol — un vendeur qui invoquerait parfois un manque de monnaie pour pousser à acheter davantage — mais l'écrasante majorité des passants en sort enchantée, et certains réclament même un site ou un compte Instagram pour pouvoir commander à distance.",
      "C'est l'adresse parfaite à glisser dans une matinée de Médina, entre deux galeries d'art ou avant de remonter vers la place Jemaâ el-Fna : on en repart le sac chargé de petits paquets parfumés qui prolongent Marrakech bien après le retour à la maison.",
    ],
  },
  {
    id: "22e7ba79-c9fb-4dc3-930a-243820f72d02",
    pretitle: "Au creux d'une ruelle de la Médina",
    title: "Riad Yima — la boutique-galerie de l'artiste Hassan Hajjaj",
    hours: "Ouvert du lundi au samedi, de 10h00 à 18h00 — fermé le dimanche.",
    paragraphs: [
      "On y arrive presque par accident, en cherchant une autre adresse, et l'on tombe sur une petite porte discrète qui mène à l'un des lieux les plus singuliers de la Médina : le Riad Yima, boutique et galerie d'art de Hassan Hajjaj, l'artiste marocain reconnu internationalement pour ses portraits pop, ses cadres en boîtes de conserve recyclées et son détournement joyeux de l'iconographie marocaine.",
      "Sur trois étages et une terrasse, on circule entre les œuvres comme on circulerait dans la tête de l'artiste : tirages encadrés, séries photographiques, objets détournés, textiles imprimés, mobilier improbable, café aménagé en installation. « Une oasis de calme dans des ruelles de la Médina », dit une visiteuse — et c'est exactement cela : un sas où le brouhaha s'arrête, où l'on prend enfin le temps de regarder.",
      "Les avis se rejoignent sur l'effet de surprise. « Quelle merveilleuse perle cachée dans la Médina ! De l'art magnifique et intéressant sur trois étages et la terrasse. Hôte très accueillant et sympathique. » Une autre y voit « une belle esthétique pour les yeux, une découverte incroyable ». Dans une ville où l'on visite surtout des monuments, le Riad Yima est l'une des rares adresses qui permettent de croiser l'art contemporain marocain dans son écosystème — fait par un Marrakchi, dans une maison de Marrakech, avec les objets de Marrakech.",
      "On peut s'y arrêter trente minutes ou une heure, repartir avec un livre, un tirage signé, une affiche, ou simplement avec l'image — durable — d'avoir traversé la Médina autrement.",
    ],
  },
  {
    id: "073659ca-3f07-4078-97ea-2566a6f75d98",
    pretitle: "Médina de Marrakech",
    title: "Medina Plaster Art — un atelier de la Médina",
    hours: "Ouvert lundi, mardi, mercredi, jeudi, vendredi, samedi, 09:00–18:00 — fermé dimanche.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Medina Plaster Art — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « ⚜️ Atelier de sculpture sur plâtre ⚜️ Décorations murales sculptées, livraison internationale ✈️ »",
      "✨ Ateliers de sculpture sur plâtre dans la vieille médina de Marrakech ✨ Nous vous proposons une expérience inoubliable d'apprentissage et de pratique de la sculpture sur plâtre, sous la direction de l'artiste professionnel Maalem Abdelaziz, fort d'une expérience de plus de 40 ans. Cet atelier vous permettra d'apprendre à sculpter des décorations en plâtre selon des techniques traditionnelles, à l'aide d'outils manuels, et de créer vos propres sculptures uniques, un souvenir précieux de cette expérience unique et enrichissante. 😊 Découvrez le riche patrimoine artistique de la région. Nos ateliers sont flexibles et adaptés à vos disponibilités, que vous souhaitiez participer une seule fois…",
    ],
  },
  {
    id: "909cb44b-e529-4b56-94b4-49293d6a3aee",
    pretitle: "Médina de Marrakech",
    title: "ALMALEH ABANOS — un atelier de la Médina",
    hours: "Ouvert tous les jours, 08:00–20:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de ALMALEH ABANOS — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Découvrez la beauté de l'artisanat syrien et marocain ✨ Marqueterie de luxe faite main • Atelier artisanal. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "91d2dcea-8ea8-43f7-85a5-60fbfc59bbab",
    pretitle: "Médina de Marrakech",
    title: "Artisan’All Marrakech — un atelier de la Médina",
    hours: "Ouvert tous les jours, 11:00–21:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Artisan’All Marrakech — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Espace des artisans et créateurs. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "6e053564-c559-4aa1-b495-a5a6d4b4fd7c",
    pretitle: "Médina de Marrakech",
    title: "Artisanat Dar Essalam — un atelier de la Médina",
    hours: "Ouvert tous les jours, 08:00–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Artisanat Dar Essalam — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Boutique d'artisanat marocain dans un palais du XIXe siècle. »",
      "Artisanat Dar Essalam est une boutique aménagée dans un riad palatial, située au cœur de la vieille ville de Marrakech, plus précisément dans le quartier d'El Ksour. Visiter Artisanat Dar Essalam, c'est aussi découvrir un magnifique patrimoine architectural, puisque la boutique est un palais depuis le XIXe siècle. La famille propriétaire a décidé d'ouvrir le palais au public en 1978 et, depuis, il est devenu une étape incontournable pour les touristes visitant Marrakech !",
    ],
  },
  {
    id: "b7173ce9-bbb1-4979-b068-172e07f7a36e",
    pretitle: "Médina de Marrakech",
    title: "Bazar Salama — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–20:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Bazar Salama — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "2bd3de7c-ac19-48ad-a1b4-9c25dbbde694",
    pretitle: "Médina de Marrakech",
    title: "Beldi Weave — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Beldi Weave — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « ♦️Tapis marocains vintage faits main et décoration intérieure. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "4b478e0f-e089-487e-bb7b-25191946bd92",
    pretitle: "Médina de Marrakech",
    title: "Bijouterie El Wady — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–21:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Bijouterie El Wady — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "641ab942-63a5-499e-999a-e09915b1d02f",
    pretitle: "Médina de Marrakech",
    title: "Boutique El Fenn — un atelier de la Médina",
    hours: "Ouvert tous les jours, 11:00–22:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Boutique El Fenn — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Objets d’art, design et artisanat marocain sélectionnés avec goût dans une atmosphère bohème chic »",
      "La Boutique El Fenn, située au cœur de l’hôtel emblématique El Fenn Marrakech, est bien plus qu’un simple espace de shopping : c’est un laboratoire de style, une curation de pièces uniques où l’art, l’artisanat et le design se rencontrent dans une harmonie subtile. Fidèle à l’esprit créatif et bohème de l’hôtel, la boutique propose une sélection raffinée d’objets soigneusement choisis pour leur authenticité, leur esthétique et leur qualité artisanale. Dès que l’on franchit la porte, on entre dans un univers visuel riche où les textures et les matières racontent une histoire : tapis berbères aux motifs vibrants, céramiques façonnées à la main, paniers tressés, objets décoratifs sculptés,…",
    ],
  },
  {
    id: "abafaa2d-2295-4a84-a5a8-9077701dc8a4",
    pretitle: "Médina de Marrakech",
    title: "Bouzaher Art — un atelier de la Médina",
    hours: "Ouvert lundi, mardi, mercredi, jeudi, vendredi, samedi, 10:00–18:30 — fermé dimanche.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Bouzaher Art — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "eb7d80b3-c4b1-45f4-8125-8ae989c7913d",
    pretitle: "Médina de Marrakech",
    title: "Chabi Chic Outlet Médina — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Chabi Chic Outlet Médina — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'adresse secrète pour chiner autrement. Au cœur de la Médina, notre outlet dévoile ses trésors en fin de collection. Un lieu discret pour les curieux, les passionnés, les amateurs d'authenticité.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "80a2817c-e9f9-4f4b-a907-efb18901e39c",
    pretitle: "Médina de Marrakech",
    title: "Chateau Des Souks — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–21:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Chateau Des Souks — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « 💯% Laine. Fait Main 👋 Expédition tous pays 🌍 »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "40a6fff6-8b0e-4f46-8447-e0e6ef18372e",
    pretitle: "Médina de Marrakech",
    title: "Chez Zouhair — un atelier de la Médina",
    hours: "Ouvert mardi, mercredi, jeudi, vendredi, samedi, dimanche, 10:00–21:00 — fermé lundi.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Chez Zouhair — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Porter des bijoux est une façon de s'exprimer sans dire un mot. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "b17d355a-6fa6-47e7-8a0d-572764bb4375",
    pretitle: "Médina de Marrakech",
    title: "Dar Bouchaib — Complexe Artisanal — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–20:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Dar Bouchaib — Complexe Artisanal — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « La maison des tapis berbères d'exception à la Kasbah de Marrakech. »",
      "Dar Bouchaib est bien plus qu'une boutique : c'est un reflet du riche patrimoine culturel et des traditions artistiques du Maroc. Implantée dans la Kasbah de Marrakech, cette maison d'artisanat travaille en étroite collaboration avec des artisans locaux, héritiers d'un savoir-faire transmis de génération en génération. Elle propose une large sélection de tapis berbères faits main — Beni Mrirt, Boucherouite, Rabat, Azilal, Glawa — ainsi que de la poterie, de la maroquinerie, des vêtements et des parfums. La boutique en ligne propose une livraison internationale gratuite.",
    ],
  },
  {
    id: "78a55875-058a-40aa-b562-e9df6e7f9838",
    pretitle: "Médina de Marrakech",
    title: "Dar Haram Cheekh — un atelier de la Médina",
    hours: "Horaires sur demande.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Dar Haram Cheekh — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Tapis, poufs, coussins et sacs marocains faits main 🇲🇦 »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "29116d9f-c61a-43b0-a3e0-e2e5b62acc30",
    pretitle: "Médina de Marrakech",
    title: "DIFFERENT. Medina — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de DIFFERENT. Medina — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Une sélection de vêtements uniques, d'accessoires originaux, de céramiques artisanales et de cadeaux chargés de sens. »",
      "Née au cœur de la médina de Marrakech, notre marque fusionne influences ethniques et orientales et énergie streetwear. Nous créons des pièces uniques, des robes d'exception aux collections homme et femme soigneusement sélectionnées pour se démarquer. Au-delà de la mode, notre univers s'étend aux accessoires, bijoux et décoration d'intérieur, tous imprégnés du même esprit créatif. Après avoir débuté à Marrakech, notre marque s'est développée jusqu'à Essaouira, et un nouveau showroom est en préparation à Sidi Ghanem… ouverture prochaine.",
    ],
  },
  {
    id: "793c144f-c1c5-47db-bd51-b86b8c089735",
    pretitle: "Médina de Marrakech",
    title: "Dune Galerie — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Dune Galerie — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Spécialisé dans les tapis, les meubles, les bijoux et les céramiques anciennes. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "7bbaf3cf-59fc-4b11-9f02-e4c9b0402f4a",
    pretitle: "Médina de Marrakech",
    title: "El Ghali Art Gallery — un atelier de la Médina",
    hours: "Horaires sur demande.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de El Ghali Art Gallery — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "65f651fe-0593-4d4e-bdbf-ce0c2fcf5c7c",
    pretitle: "Médina de Marrakech",
    title: "Galerie Dar El Bacha — un atelier de la Médina",
    hours: "Horaires sur demande.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Galerie Dar El Bacha — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Magasin d'ameublement et de décoration. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "17469777-4da8-4d8f-957b-282b1c87dc7d",
    pretitle: "Médina de Marrakech",
    title: "Galerie Talsint - Palais Saâdien — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–18:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Galerie Talsint - Palais Saâdien — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Une galerie d'art dans un cadre architectural somptueux pour les visiteurs en quête d'authenticité culturelle. »",
      "Avec plus de 70 ans d'expérience dans le commerce de tapis et de kilims marocains, nous proposons un large choix de produits de qualité supérieure adaptés à tous les goûts et à toutes les envies. Notre approche est très différente : nous proposons à nos clients, que nous considérons comme des invités, une visite complète afin qu'ils puissent mieux connaître tous les types de tapis marocains et comprendre les différences entre les tribus et les régions. Nous passons ensuite aux tendances en matière de design d'intérieur pour affiner le processus de sélection. Nos conseillers de vente sont parfaitement au courant de ces tendances et vous aideront à trouver la pièce qui s'harmonisera avec…",
    ],
  },
  {
    id: "a292c667-b345-423b-8f1d-404423e1c807",
    pretitle: "Médina de Marrakech",
    title: "IJ BELDI — un atelier de la Médina",
    hours: "Horaires sur demande.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de IJ BELDI — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Explorez l'artisanat Marocain et laissez-vous transporter par la magie des traditions. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "d978dd11-2ca5-4134-a519-e4bf5b880ce7",
    pretitle: "Médina de Marrakech",
    title: "Imad Rugs - by Imad Farah — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:30–18:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Imad Rugs - by Imad Farah — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "05304d1f-7019-4545-8eae-e4568d7bf7a5",
    pretitle: "Médina de Marrakech",
    title: "Khmissa Marrakech — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–21:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Khmissa Marrakech — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "cf96cbf3-1bda-44c3-90e2-bd193888a4a5",
    pretitle: "Médina de Marrakech",
    title: "La Porte d’Or — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:30–19:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de La Porte d’Or — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « La plus grande collection de tapis et kilims de luxe du Maroc. Un savoir-faire familial depuis 1970. »",
      "À La Porte d'Or, nous ne vendons pas seulement des tapis, nous préservons un héritage. Depuis 1970, nous tissons un lien entre les artisans marocains et ceux qui recherchent authenticité, culture et savoir-faire. Chaque pièce que nous proposons est bien plus qu'un simple tissu et un fil ; c'est une histoire tissée avec intention, un symbole de tradition transmise de génération en génération. Nous collaborons avec les maîtres tisserands du Maroc, garantissant ainsi que chaque tapis porte l'âme de son créateur. Chaque motif reflète un savoir-faire séculaire, façonné à la main selon des techniques qui honorent l'héritage berbère. Grâce à notre sélection, nous offrons ces trésors au monde…",
    ],
  },
  {
    id: "58213f82-e29b-4f7c-84ae-82b26a006cbd",
    pretitle: "Médina de Marrakech",
    title: "Lahandira — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–19:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Lahandira — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "cba52b9c-95e7-46bf-87fe-7bd16428197e",
    pretitle: "Médina de Marrakech",
    title: "Layal Concept Store — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:00–21:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Layal Concept Store — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Marque de maroquinerie et de créations originales | Based in Marrakech | Handmade créations | Limited Editions »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "02a78860-40f2-452b-bb77-99016dd36925",
    pretitle: "Médina de Marrakech",
    title: "M Vitrine by Medina Heritage — un atelier de la Médina",
    hours: "Ouvert tous les jours, 12:00–23:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de M Vitrine by Medina Heritage — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Concept store proposant une vaste sélection de produits marocains artisanaux, créés par plus de 40 artisans. »",
      "M Vitrine est un concept store proposant une vaste sélection de produits marocains artisanaux, créés par plus de 40 artisans. Vêtements, bijoux, sacs, chaussures, sandales, parfums, tapis, vaisselle, bougies et bien d'autres articles, confectionnés avec passion par des designers talentueux et renommés de Marrakech, Fès, Rabat et Casablanca. Le Maroc possède une riche tradition artisanale, à tel point que de nombreux visiteurs choisissent d'embellir leur intérieur avec des objets d'artisanat marocain, présents dans de nombreux foyers à travers le monde depuis des siècles. Venez découvrir chez M Vitrine ces merveilles et donnez une touche artistique à votre voyage ! Si vous visitez notre…",
    ],
  },
  {
    id: "77e9f1f4-7848-46b5-a8b0-e3d7e48da945",
    pretitle: "Médina de Marrakech",
    title: "Marie Bastide Medina — un atelier de la Médina",
    hours: "Ouvert lundi, mardi, mercredi, jeudi, vendredi, samedi, 10:00–19:00 — fermé dimanche.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Marie Bastide Medina — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Boutique d'art et d'artisanat marocain d'exception dans la Medina. »",
      "Depuis sa création en 2018, Marie Bastide Marrakech incarne la beauté et l'artisanat du Maroc à travers ses produits. Fière de ses racines marocaines, la marque s'engage à offrir des articles 100% locaux, reflétant l'authenticité et la richesse de la culture marocaine. Studio de design et boutique d'art à Guéliz proposant des créations originales inspirées du Maroc : photographies artistiques, illustrations, objets artisanaux, foulards en soie, bougies naturelles, arts de la table, papeterie et décoration. Entreprise familiale, indépendante et engagée dans la préservation de la production locale. LIVRAISON INTERNATIONALENous proposons la livraison dans le monde entier. Frais calculés…",
    ],
  },
  {
    id: "5a400d85-03fd-451f-a9c5-f3aa65f1d6a5",
    pretitle: "Médina de Marrakech",
    title: "Mustapha Blaoui — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:30–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Mustapha Blaoui — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « La caverne d'Alibaba du prince décorateur Mustapha Blaoui. Une boutique emblématique de la médina. »",
      "Mustapha Blaoui Boutique est bien plus qu’une boutique : c’est une adresse culte de la médina de Marrakech, un lieu où l’artisanat marocain dialogue avec le design contemporain. Installée dans un ancien riad au charme brut, la maison propose une sélection pointue de mobilier, d’objets décoratifs et de pièces uniques issues des savoir-faire traditionnels du Maroc. Bois sculpté, zelliges, tapis berbères, céramiques, luminaires et textiles anciens se mêlent à des créations audacieuses, parfois monumentales, toujours chargées d’âme. Chaque espace est pensé comme une scénographie, invitant à la déambulation et à la découverte, entre influences berbères, andalouses et modernistes. La patine du…",
    ],
  },
  {
    id: "fe449a73-9c44-4631-9350-f8b9242a829e",
    pretitle: "Médina de Marrakech",
    title: "Nomads Crafts — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:30–19:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Nomads Crafts — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Des créations uniques qui racontent une histoire !  Livraison internationale. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "ecc940a8-e306-4d31-9947-c41a135f10ab",
    pretitle: "Médina de Marrakech",
    title: "Palais Filali — un atelier de la Médina",
    hours: "Ouvert tous les jours, 09:30–20:30.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Palais Filali — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « ✨ Votre dose quotidienne de magnifiques tapis. 🚀 Livraison internationale | Vente en gros et au détail. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
  {
    id: "9e0a2a43-5fc3-445b-92a8-6ffb9d9f42f2",
    pretitle: "Médina de Marrakech",
    title: "Soufiane Zarib — un atelier de la Médina",
    hours: "Ouvert lundi, mardi, mercredi, jeudi, vendredi, samedi, 08:30–19:30 — fermé dimanche.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Soufiane Zarib — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Tapis Beni authentiques – Tissés à la main au Maroc »",
      "Chez Soufiane Zarib , nous sommes spécialisés dans les authentiques tapis Beni, tissés à la main par des artisans berbères talentueux dans les montagnes de l'Atlas marocain. Chaque pièce de notre collection est une œuvre d'art unique, alliant beauté minimaliste et tradition séculaire. Nos tapis Beni Ourain sont confectionnés en laine 100 % naturelle et arborent des motifs géométriques noirs et blancs intemporels, une texture douce et une qualité durable. Que vous optiez pour un intérieur moderne ou une ambiance bohème chaleureuse, nos tapis apportent profondeur, histoire et âme à votre espace. Nous travaillons directement avec des tisserands marocains, garantissant ainsi des pratiques…",
    ],
  },
  {
    id: "b3a36472-87fb-4c73-81a5-eb3600e0d01b",
    pretitle: "Médina de Marrakech",
    title: "Style Berbere — un atelier de la Médina",
    hours: "Ouvert tous les jours, 10:00–20:00.",
    paragraphs: [
      "Au détour d'une ruelle de la Médina, on pousse la porte de Style Berbere — une de ces adresses où l'artisanat marocain se vit encore au geste, à la main, dans la durée.",
      "L'esprit du lieu en une phrase : « Bijoux & pierres précieuses. »",
      "On y entre par curiosité, on s'y attarde pour la qualité du travail, et l'on en repart avec une pièce qui prolonge la Médina bien après le retour à la maison.",
    ],
  },
];

const ArtisanatMedinaMarrakech = () => (
  <BlogArticleTemplate
    entries={ATELIERS}
    articlePath="/blog/artisanat-medina-marrakech"
    articleTitle="Artisanat marocain dans la Médina de Marrakech"
    articleDescription="Huit ateliers et boutiques de la Médina — tapis berbères, caftans, poteries, maroquinerie, savonnerie et galerie d'art — où l'artisanat marocain se vit, se touche et se rapporte chez soi."
    bookmarkSlug="artisanat-medina-marrakech"
    heroAlt="Artisanat marocain dans la Médina de Marrakech"
    heroTitleTop="Artisanat marocain"
    heroTitleBottom="dans la Médina de Marrakech"
    heroSubtitle="Huit ateliers et boutiques où l'artisanat marocain se vit encore au geste — tapis berbères, caftans, poteries, maroquinerie, savonnerie et galerie d'art au cœur de la Médina."
    intro="La Médina de Marrakech, ce sont d'abord des ruelles — un labyrinthe de souks où l'on peut tout acheter et n'importe quoi. Mais derrière les vitrines à touristes se cache une autre Médina, plus discrète : celle des ateliers familiaux fondés dans les années soixante, des tisserands qui n'ont jamais arrêté leur métier à tisser, des céramistes qui mêlent argile rouge et argile blanche, des couturiers de caftans, des savonniers et des artistes contemporains qui ont fait de la vieille ville leur laboratoire. Voici nos huit adresses préférées, toutes à quelques pas les unes des autres, accessibles à pied depuis la place Jemaâ el-Fna."
    datePublished="2026-06-13T08:00:00+01:00"
  />
);

export default ArtisanatMedinaMarrakech;

