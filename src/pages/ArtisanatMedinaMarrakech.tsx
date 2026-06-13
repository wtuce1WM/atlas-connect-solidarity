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

